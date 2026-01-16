package com.merncrmmobile;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.media.MediaRecorder;
import android.util.Log;
import java.io.IOException;

public class RecordingService extends AccessibilityService {
    public static RecordingService instance;
    private MediaRecorder recorder;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Log.d("RecordingService", "Service Connected");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // No-op
    }

    @Override
    public void onInterrupt() {
        Log.d("RecordingService", "Service Interrupted");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        instance = null;
    }

    public boolean startRecording(String path) {
        if (recorder != null)
            return false;

        Log.d("RecordingService", "Starting Accessibility recording to: " + path);
        try {
            recorder = new MediaRecorder();
            // VOICE_RECOGNITION is the key for Accessibility Service recording
            recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setOutputFile(path);
            recorder.prepare();
            recorder.start();
            return true;
        } catch (Exception e) {
            Log.e("RecordingService", "Failed to start recording", e);
            recorder = null;
            return false;
        }
    }

    public void stopRecording() {
        if (recorder != null) {
            try {
                recorder.stop();
            } catch (RuntimeException stopException) {
                // handle cleanup on failure
            }
            recorder.reset();
            recorder.release();
            recorder = null;
            Log.d("RecordingService", "Recording stopped");
        }
    }
}
