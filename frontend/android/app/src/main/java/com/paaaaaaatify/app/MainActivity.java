package com.paaaaaaatify.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    private static final String TAG = "MainActivity";

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Required verification hook for SocialLoginPlugin
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        // Forward only Google authorization request codes within MIN (inclusive) and MAX (exclusive)
        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            if (getBridge() != null) {
                PluginHandle handle = getBridge().getPlugin("SocialLogin");
                if (handle != null) {
                    Plugin plugin = handle.getInstance();
                    if (plugin instanceof SocialLoginPlugin) {
                        ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
                    } else {
                        Log.w(TAG, "SocialLogin plugin handle instance is not an instance of SocialLoginPlugin");
                    }
                } else {
                    Log.w(TAG, "SocialLogin plugin handle is not available on Capacitor bridge");
                }
            } else {
                Log.w(TAG, "Capacitor bridge is not available");
            }
        }
    }
}
