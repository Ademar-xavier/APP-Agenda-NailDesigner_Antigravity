# ProGuard Rules para Proteção Anti-Clonagem e Anti-Engenharia Reversa (Release APK)

# Oculta nomes de arquivos fonte e linhas originais
-repackageclasses ''
-allowaccessmodification
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Remove chamadas de log em produção
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# Mantém plugins Capacitor essenciais
-keep class com.getcapacitor.** { *; }
-keep class com.sheilasantosnails.agenda.** { *; }
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
