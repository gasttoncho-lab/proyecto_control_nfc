package com.example.loginapp

import android.content.Context
import android.util.Log
import timber.log.Timber
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class FileLoggingTree(private val context: Context) : Timber.Tree() {

    companion object {
        private const val MAX_LOG_FILES = 7
        private val fileDateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        private val logTimeFmt  = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US)
    }

    override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
        if (priority < Log.INFO) return  // skip VERBOSE / DEBUG in release

        try {
            val logDir = context.getExternalFilesDir("logs") ?: return
            logDir.mkdirs()
            pruneOldLogs(logDir)

            val today    = fileDateFmt.format(Date())
            val logFile  = File(logDir, "log-$today.txt")
            val level    = priorityChar(priority)
            val time     = logTimeFmt.format(Date())
            val tagLabel = tag ?: "App"

            FileWriter(logFile, true).use { w ->
                w.write("$time $level/$tagLabel: $message\n")
                if (t != null) w.write("  ${t.stackTraceToString()}\n")
            }
        } catch (_: Exception) {
            // never crash the app because of logging
        }
    }

    private fun priorityChar(priority: Int) = when (priority) {
        Log.VERBOSE -> 'V'
        Log.DEBUG   -> 'D'
        Log.INFO    -> 'I'
        Log.WARN    -> 'W'
        Log.ERROR   -> 'E'
        Log.ASSERT  -> 'A'
        else        -> '?'
    }

    private fun pruneOldLogs(dir: File) {
        dir.listFiles { f -> f.name.startsWith("log-") && f.name.endsWith(".txt") }
            ?.sortedByDescending { it.name }
            ?.drop(MAX_LOG_FILES)
            ?.forEach { it.delete() }
    }
}
