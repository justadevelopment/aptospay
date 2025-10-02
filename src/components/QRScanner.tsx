"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { parsePaymentRequest, validatePaymentRequest, PaymentRequest } from "@/lib/qr";

interface QRScannerProps {
  onScanSuccess: (paymentRequest: PaymentRequest) => void;
  onScanError?: (error: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScanSuccess, onScanError, onClose }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrCodeRegionId = "qr-reader";

  useEffect(() => {
    // Check camera permission status
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'camera' as PermissionName }).then((result) => {
        setCameraPermission(result.state as 'granted' | 'denied' | 'prompt');
      });
    }
  }, []);

  const startScanning = async () => {
    try {
      setError("");
      setScanning(true);

      // Initialize scanner
      const html5QrCode = new Html5Qrcode(qrCodeRegionId);
      scannerRef.current = html5QrCode;

      // Start scanning
      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10, // Frames per second
          qrbox: { width: 250, height: 250 }, // Scanning box size
        },
        async (decodedText) => {
          // Success callback
          try {
            // Parse and validate payment request
            const paymentRequest = parsePaymentRequest(decodedText);
            validatePaymentRequest(paymentRequest);

            // Stop scanning
            await stopScanning();

            // Call success callback
            onScanSuccess(paymentRequest);
          } catch (parseError) {
            const errorMsg = parseError instanceof Error ? parseError.message : 'Invalid QR code';
            setError(errorMsg);
            if (onScanError) {
              onScanError(errorMsg);
            }
          }
        },
        (errorMessage) => {
          // Error callback (continuous scanning errors, can be ignored)
          console.debug("QR scan error:", errorMessage);
        }
      );

      setCameraPermission('granted');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start camera';
      setError(errorMsg);
      setScanning(false);
      setCameraPermission('denied');

      if (onScanError) {
        onScanError(errorMsg);
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setScanning(false);
  };

  const handleClose = async () => {
    await stopScanning();
    onClose();
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gunmetal">Scan QR Code</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-lavender-web rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scanner Area */}
        <div className="mb-6">
          {!scanning && cameraPermission !== 'denied' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-columbia-blue rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gunmetal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <p className="text-gunmetal/60 mb-4">
                Position the QR code within the frame to scan
              </p>
              <button
                onClick={startScanning}
                className="w-full py-3 px-6 bg-gunmetal text-white rounded-xl font-semibold hover:bg-gunmetal/90 transition-all"
              >
                Start Camera
              </button>
            </div>
          )}

          {cameraPermission === 'denied' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-600 font-semibold mb-2">Camera Access Denied</p>
              <p className="text-gunmetal/60 text-sm">
                Please enable camera permissions in your browser settings to scan QR codes
              </p>
            </div>
          )}

          {/* QR Scanner Element */}
          <div id={qrCodeRegionId} className={scanning ? "block" : "hidden"} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-900">Scan Failed</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-columbia-blue/10 rounded-xl p-4">
          <h3 className="font-semibold text-gunmetal mb-2 text-sm">Tips for scanning:</h3>
          <ul className="text-sm text-gunmetal/60 space-y-1">
            <li>• Hold your device steady</li>
            <li>• Ensure good lighting</li>
            <li>• Keep the QR code within the frame</li>
            <li>• Avoid glare and reflections</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
