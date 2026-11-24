package com.maxgains.watch

import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class MainActivity : ComponentActivity() {
    private val steps = HealthPermission.getReadPermission(StepsRecord::class)
    private val sleep = HealthPermission.getReadPermission(SleepSessionRecord::class)
    private val heart = HealthPermission.getReadPermission(HeartRateRecord::class)
    private val resting = HealthPermission.getReadPermission(RestingHeartRateRecord::class)
    private val requested = setOf(steps, sleep, heart, resting)
    private lateinit var status: TextView
    private lateinit var summary: TextView
    private lateinit var connect: Button
    private lateinit var refresh: Button
    private lateinit var export: Button
    private var snapshot: String? = null
    private var pendingExport: String? = null
    private var busy = false
    private val requestPermissions = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { readHealth() }
    private val saveFile = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val content = pendingExport; pendingExport = null
        if (uri != null && content != null) lifecycleScope.launch {
            try {
                withContext(Dispatchers.IO) { contentResolver.openOutputStream(uri, "wt")?.use { it.write(content.toByteArray(Charsets.UTF_8)) } ?: error("Unable to open file") }
                status.text = "Export saved. Open MAX GAINS → Health → Import watch JSON."
            } catch (e: Exception) { if (e is CancellationException) throw e; status.text = "Export failed: ${e.message}" }
        }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val density = resources.displayMetrics.density
        val pad = (20 * density).toInt()
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(pad,pad,pad,pad) }
        fun text(s: String, size: Float = 16f) = TextView(this).apply { text = s; textSize = size; setPadding(0,8,0,8) }
        layout.addView(text("MAX GAINS · Watch", 26f))
        layout.addView(text("Read the last 14 calendar days from Android Health Connect, including today. Samsung Health must already be sharing its data. No health data is uploaded by this companion."))
        connect = Button(this).apply { text = "Connect / change permissions"; setOnClickListener { connectHealth() } }
        refresh = Button(this).apply { text = "Refresh health data"; setOnClickListener { readHealth() } }
        export = Button(this).apply { text = "Export for MAX GAINS"; isEnabled = false; setOnClickListener { pendingExport = snapshot; saveFile.launch("MAX-GAINS-watch-${LocalDate.now()}.json") } }
        layout.addView(connect); layout.addView(refresh); layout.addView(export)
        status = text("Checking Health Connect…"); layout.addView(status)
        summary = text(""); layout.addView(summary)
        layout.addView(Button(this).apply { text = "Privacy information"; setOnClickListener { startActivity(android.content.Intent(this@MainActivity, PrivacyActivity::class.java)) } })
        setContentView(ScrollView(this).apply { addView(layout) })
    }
    override fun onStart() { super.onStart(); if (::status.isInitialized) readHealth() }
    private fun available(): Boolean {
        val sdk = HealthConnectClient.getSdkStatus(this)
        if (sdk != HealthConnectClient.SDK_AVAILABLE) {
            status.text = if (sdk == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) "Install or update Health Connect, then reopen this app." else "Health Connect is unavailable on this device."
            snapshot = null; export.isEnabled = false; return false
        }
        return true
    }
    private fun connectHealth() {
        if (!available() || busy) return
        lifecycleScope.launch {
            try { requestPermissions.launch(requested) }
            catch (e: Exception) { if (e is CancellationException) throw e; status.text = "Could not open permissions: ${e.message}" }
        }
    }
    private fun readHealth() {
        if (busy || !available()) return
        busy = true; connect.isEnabled = false; refresh.isEnabled = false; export.isEnabled = false; snapshot = null
        status.text = "Reading permitted data…"
        lifecycleScope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(this@MainActivity)
                val granted = client.permissionController.getGrantedPermissions().intersect(requested)
                if (granted.isEmpty()) { status.text = "No read permissions granted. Tap Connect to choose what to share."; summary.text = ""; return@launch }
                val zone = ZoneId.systemDefault(); val now = Instant.now(); val today = now.atZone(zone).toLocalDate()
                val days = JSONArray(); val failures = mutableSetOf<String>(); var count = 0
                for (offset in 13 downTo 0) {
                    val date = today.minusDays(offset.toLong()); val start = date.atStartOfDay(zone).toInstant(); val end = minOf(date.plusDays(1).atStartOfDay(zone).toInstant(), now)
                    if (!end.isAfter(start)) continue
                    val row = JSONObject().put("date", date.toString())
                    val range = TimeRangeFilter.between(start, end)
                    suspend fun <T : Any> metric(permission: String, label: String, key: String, value: suspend () -> T?, convert: (T) -> Number) {
                        if (permission !in granted) return
                        try { value()?.let { row.put(key, convert(it)) } }
                        catch (e: CancellationException) { throw e }
                        catch (e: Exception) { failures.add(label) }
                    }
                    metric(steps,"steps","steps", { client.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL),range))[StepsRecord.COUNT_TOTAL] }, { it })
                    metric(sleep,"sleep","sleep_minutes", { client.aggregate(AggregateRequest(setOf(SleepSessionRecord.SLEEP_DURATION_TOTAL),range))[SleepSessionRecord.SLEEP_DURATION_TOTAL] }, { it.toMinutes() })
                    metric(heart,"heart rate","heart_rate_avg", { client.aggregate(AggregateRequest(setOf(HeartRateRecord.BPM_AVG),range))[HeartRateRecord.BPM_AVG] }, { it })
                    metric(resting,"resting heart rate","resting_heart_rate", { client.aggregate(AggregateRequest(setOf(RestingHeartRateRecord.BPM_AVG),range))[RestingHeartRateRecord.BPM_AVG] }, { it })
                    if (row.length()>1) { days.put(row); count++ }
                }
                snapshot = if (count > 0) JSONObject().put("format","MAX-GAINS-HEALTH-v1").put("generated_at",now.toString()).put("timezone",zone.id).put("days",days).toString(2) else null
                status.text = "Read $count of 14 days · ${granted.size}/4 permissions granted." + if (failures.isNotEmpty()) " Some queries failed: ${failures.joinToString()}. Missing values are omitted." else ""
                summary.text = if (count==0) "No readings available. Open Samsung Health, check Health Connect sharing and refresh." else (days.length()-1 downTo 0).joinToString("\n\n") { i -> val r=days.getJSONObject(i); "${r.getString("date")}\nSteps: ${r.optString("steps","—")} · Sleep session: ${r.optString("sleep_minutes","—")} min\nAverage HR: ${r.optString("heart_rate_avg","—")} · Resting HR: ${r.optString("resting_heart_rate","—")} bpm" }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { status.text = "Read failed: ${e.message}"; summary.text = "" }
            finally { busy = false; connect.isEnabled = true; refresh.isEnabled = true; export.isEnabled = snapshot != null }
        }
    }
}

class PrivacyActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val text = TextView(this).apply {
            textSize = 17f; setPadding(40,40,40,40)
            text = "MAX GAINS Watch privacy\n\nThe app requests read-only access to steps, sleep sessions, heart rate and resting heart rate. It reads the previous 14 calendar days and holds the daily summaries in memory. It has no internet permission and does not send data to any server. Export saves a JSON file only to the location you select. Files may contain sensitive health information. Delete exports manually when no longer needed. You can revoke access at any time in Android Health Connect settings. Imported files in MAX GAINS are stored separately in your browser. No medical diagnosis is provided."
        }
        setContentView(ScrollView(this).apply { addView(text) })
    }
}
