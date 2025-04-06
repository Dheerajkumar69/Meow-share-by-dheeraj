import React, { useState } from 'react';
import Head from 'next/head';
import FileUploadArea from '../components/FileUploadArea';
import QRCodeButton from '../components/QRCodeButton';
import ConnectionDisplay from '../components/ConnectionDisplay';
import NearbyButton from '../components/NearbyButton';

export default function Home() {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showNearbyDevices, setShowNearbyDevices] = useState(false);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>Simple File Sharing</title>
        <meta name="description" content="Share files directly between devices" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Simple File Sharing</h1>
          <p className="text-xl text-gray-600">Transfer files directly between devices</p>
        </div>

        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
          <FileUploadArea />
          
          <div className="mt-8 grid grid-cols-2 gap-4">
            <QRCodeButton onClick={() => setShowQRScanner(true)} />
            <NearbyButton onClick={() => setShowNearbyDevices(true)} />
          </div>
          
          <div className="mt-8">
            <ConnectionDisplay />
          </div>
        </div>
      </main>

      {/* QR Scanner modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Scan QR Code</h2>
            <p className="mb-4">
              This feature would open your camera to scan a QR code.
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setShowQRScanner(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nearby devices modal */}
      {showNearbyDevices && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Find Nearby Devices</h2>
            <p className="mb-4">
              This feature requires Web Bluetooth API, which may not be supported in all browsers.
              For best compatibility, use Chrome or Edge on desktop, or Chrome on Android.
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setShowNearbyDevices(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 