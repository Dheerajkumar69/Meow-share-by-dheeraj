import React from 'react';

const ConnectionDisplay: React.FC = () => {
  // This would be populated with real connection status
  const isConnected = false;
  const connectionInfo = {
    deviceName: 'No device connected',
    status: 'disconnected'
  };
  
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-2">Connection Status</h3>
      
      <div className="flex items-center">
        <div 
          className={`w-3 h-3 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
        <span className={isConnected ? 'text-green-700' : 'text-gray-500'}>
          {connectionInfo.deviceName}
        </span>
      </div>
      
      <div className="mt-4">
        {isConnected ? (
          <button
            className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <div className="text-sm text-gray-500">
            Use the buttons above to connect to a device
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionDisplay; 