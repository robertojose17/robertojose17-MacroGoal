import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export default function Index() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const isStuck = elapsed > 5;
  const stuckMessage = 'Taking longer than expected. Check Metro logs for errors.';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#5B9AA8" />
      <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>
        Loading...
      </Text>
      <Text style={{ color: '#666', fontSize: 14 }}>
        {elapsed}
        s
      </Text>
      {isStuck && (
        <Text style={{ marginTop: 8, color: '#ff4444', fontSize: 12, textAlign: 'center', paddingHorizontal: 20 }}>
          {stuckMessage}
        </Text>
      )}
    </View>
  );
}
