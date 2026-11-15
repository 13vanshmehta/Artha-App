package com.frontend

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ArthaNotificationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val CHANNEL_ID = "artha_financial_alerts"
        const val CHANNEL_NAME = "Financial Alerts & Updates"
        const val CHANNEL_DESC = "Real-time notifications for transactions, transfers, and account updates."
    }

    override fun getName(): String = "ArthaNotificationManager"

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = CHANNEL_DESC
                setShowBadge(true)
            }
            val notificationManager: NotificationManager =
                reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    @ReactMethod
    fun areNotificationsEnabled(promise: Promise) {
        try {
            val nm = NotificationManagerCompat.from(reactApplicationContext)
            promise.resolve(nm.areNotificationsEnabled())
        } catch (e: Throwable) {
            promise.reject("E_NOTIF_CHECK", e.message, e)
        }
    }

    @ReactMethod
    fun showNotification(
        title: String,
        message: String,
        notificationId: Double,
        promise: Promise
    ) {
        try {
            createNotificationChannel()

            val intent = Intent(reactApplicationContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val flagImmutable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val reqCode = if (notificationId > 0) notificationId.toInt() else System.currentTimeMillis().toInt()
            val pendingIntent = PendingIntent.getActivity(
                reactApplicationContext,
                reqCode,
                intent,
                flagImmutable
            )

            val builder = NotificationCompat.Builder(reactApplicationContext, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)

            val nm = NotificationManagerCompat.from(reactApplicationContext)
            val id = if (notificationId > 0) notificationId.toInt() else (System.currentTimeMillis() % 100000).toInt()

            if (nm.areNotificationsEnabled()) {
                nm.notify(id, builder.build())
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Throwable) {
            promise.reject("E_NOTIF_SHOW", e.message, e)
        }
    }
}
