package com.sheilasantosnails.agenda;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AgendaSyncReceiver extends BroadcastReceiver {
    private static final String TAG = "AgendaSyncReceiver";
    public static final String ACTION_SYNC = "com.sheilasantosnails.agenda.ACTION_SYNC";
    public static final String CHANNEL_ID = "agendamentos_nail_v2";
    public static final String CHANNEL_NAME = "Alertas de Agendamentos e Clientes";
    private static final String PREFS_NAME = "nail_notifications_prefs";
    private static final String KEY_NOTIFIED_IDS = "notified_avisos_ids";
    private static final String KEY_FIRST_RUN = "first_run_sync_done";

    private static final String SUPABASE_URL = "https://skdvaxezhskfsfhmvajt.supabase.co/rest/v1/configuracoes?id=eq.salao_principal&select=config_salao";
    private static final String SUPABASE_ANON_KEY = "sb_publishable_sdzeLBdQeUgfY-7sHwPW5g_2UqZ3Rap";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "onReceive triggered with action: " + action);

        // Garante o agendamento do próximo alarme
        scheduleNext(context);

        // Executa a checagem em background
        checkSupabaseAvisos(context);
    }

    public static void scheduleNext(Context context) {
        if (context == null) return;
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(context, AgendaSyncReceiver.class);
            intent.setAction(ACTION_SYNC);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getBroadcast(context, 7701, intent, flags);
            long triggerAt = System.currentTimeMillis() + 60 * 1000; // a cada 1 minuto

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
            Log.d(TAG, "Próximo alarme agendado com sucesso para daqui a 60s");
        } catch (Exception e) {
            Log.e(TAG, "Erro ao agendar alarme de sync:", e);
        }
    }

    public static void checkSupabaseAvisos(Context context) {
        if (context == null) return;
        final Context appContext = context.getApplicationContext();

        executor.execute(() -> {
            PowerManager pm = (PowerManager) appContext.getSystemService(Context.POWER_SERVICE);
            PowerManager.WakeLock wakeLock = null;
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NailAgenda:SyncCheckWakeLock");
                try {
                    wakeLock.acquire(15000); // no máximo 15 segundos
                } catch (Exception ignored) {}
            }

            HttpURLConnection conn = null;
            try {
                URL url = new URL(SUPABASE_URL);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY);
                conn.setRequestProperty("Accept", "application/json");

                int responseCode = conn.getResponseCode();
                if (responseCode >= 200 && responseCode < 300) {
                    InputStream is = conn.getInputStream();
                    BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line);
                    }
                    reader.close();

                    String jsonStr = sb.toString().trim();
                    if (jsonStr.startsWith("[")) {
                        JSONArray array = new JSONArray(jsonStr);
                        if (array.length() > 0) {
                            JSONObject item = array.getJSONObject(0);
                            if (item.has("config_salao")) {
                                JSONObject configSalao = item.getJSONObject("config_salao");
                                if (configSalao.has("avisos_nao_lidos")) {
                                    JSONArray avisos = configSalao.getJSONArray("avisos_nao_lidos");
                                    processarAvisos(appContext, avisos);
                                }
                            }
                        }
                    }
                } else {
                    Log.w(TAG, "Supabase retornou código HTTP: " + responseCode);
                }
            } catch (Exception e) {
                Log.e(TAG, "Falha ao verificar avisos no Supabase em background:", e);
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
                if (wakeLock != null && wakeLock.isHeld()) {
                    try {
                        wakeLock.release();
                    } catch (Exception ignored) {}
                }
            }
        });
    }

    private static void processarAvisos(Context context, JSONArray avisos) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            Set<String> notifiedIds = new HashSet<>(prefs.getStringSet(KEY_NOTIFIED_IDS, new HashSet<>()));
            boolean isFirstRun = !prefs.getBoolean(KEY_FIRST_RUN, false);

            if (isFirstRun) {
                // Na primeira execução após instalar/atualizar, marca todos os existentes como já processados
                // para que o app não faça spam de avisos históricos antigos
                for (int i = 0; i < avisos.length(); i++) {
                    JSONObject a = avisos.optJSONObject(i);
                    if (a != null) {
                        String id = a.optString("id");
                        if (!id.isEmpty()) notifiedIds.add(id);
                    }
                }
                prefs.edit()
                    .putBoolean(KEY_FIRST_RUN, true)
                    .putStringSet(KEY_NOTIFIED_IDS, notifiedIds)
                    .apply();
                Log.d(TAG, "Primeira execução do sync inicializada com " + notifiedIds.size() + " avisos existentes.");
                return;
            }

            boolean mudou = false;
            for (int i = 0; i < avisos.length(); i++) {
                JSONObject a = avisos.optJSONObject(i);
                if (a == null) continue;

                String id = a.optString("id");
                boolean lido = a.optBoolean("lido", false);

                // Notifica apenas avisos NÃO lidos e ainda NÃO notificados no celular
                if (!lido && !id.isEmpty() && !notifiedIds.contains(id)) {
                    String titulo = a.optString("titulo", "Sheila Santos Nails");
                    String mensagem = a.optString("mensagem", "Você recebeu um novo aviso!");

                    dispararNotificacaoNativa(context, id, titulo, mensagem);

                    notifiedIds.add(id);
                    mudou = true;
                }
            }

            if (mudou) {
                prefs.edit().putStringSet(KEY_NOTIFIED_IDS, notifiedIds).apply();
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao processar avisos:", e);
        }
    }

    private static void dispararNotificacaoNativa(Context context, String avisoId, String titulo, String mensagem) {
        try {
            criarCanalSeNecessario(context);

            Intent appIntent = new Intent(context, MainActivity.class);
            appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            appIntent.putExtra("avisoId", avisoId);

            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getActivity(context, (int) System.currentTimeMillis(), appIntent, pendingFlags);

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(titulo)
                .setContentText(mensagem)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(mensagem))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setVibrate(new long[]{0, 300, 200, 300})
                .setColor(Color.parseColor("#C71585"))
                .setContentIntent(pi);

            NotificationManagerCompat nmc = NotificationManagerCompat.from(context);
            int notifId = (int) (System.currentTimeMillis() % 1000000);
            nmc.notify(notifId, builder.build());
            Log.d(TAG, "Notificação disparada com sucesso no painel: " + titulo + " | " + mensagem);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao disparar notificação nativa:", e);
        }
    }

    public static void criarCanalSeNecessario(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = nm.getNotificationChannel(CHANNEL_ID);
                if (channel == null) {
                    channel = new NotificationChannel(
                        CHANNEL_ID,
                        CHANNEL_NAME,
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("Notificações em tempo real sobre novos agendamentos, confirmações e avisos");
                    channel.enableLights(true);
                    channel.setLightColor(Color.MAGENTA);
                    channel.enableVibration(true);
                    channel.setVibrationPattern(new long[]{0, 300, 200, 300});
                    channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                    nm.createNotificationChannel(channel);
                }
            }
        }
    }
}
