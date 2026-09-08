package com.sheilasantosnails.agenda;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Cria o canal de notificações de alta prioridade
        AgendaSyncReceiver.criarCanalSeNecessario(this);

        // Solicita permissão de POST_NOTIFICATIONS no Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        // Solicita desativar otimização de bateria se necessário para garantir execução com app fechado
        solicitarIgnorarOtimizacaoBateria();

        // Inicia o alarme e faz checagem imediata
        AgendaSyncReceiver.scheduleNext(this);
        AgendaSyncReceiver.checkSupabaseAvisos(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        AgendaSyncReceiver.scheduleNext(this);
        AgendaSyncReceiver.checkSupabaseAvisos(this);
    }

    private void solicitarIgnorarOtimizacaoBateria() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                }
            } catch (Exception ignored) {
            }
        }
    }
}
