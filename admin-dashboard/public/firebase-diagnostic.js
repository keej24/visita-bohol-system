// Simple Firebase Auth test
console.log('=== Firebase Auth Diagnostic ===');

// Test 1: Check if Firebase is reachable
fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({})
})
.then(response => {
  console.log('Firebase Project Config Response:', response.status, response.statusText);
  if (!response.ok) {
    console.error('Project config failed with status:', response.status);
  }
  return response.text();
})
.then(data => {
  console.log('Project config data:', data);
})
.catch(error => {
  console.error('Project config error:', error);
});

// Test 2: Check Firestore connectivity
fetch('https://firestore.googleapis.com/v1/projects/visitaproject-5cd9f/databases/(default)/documents', {
  headers: {
    'Authorization': 'Bearer invalid-token-for-test',
  }
})
.then(response => {
  console.log('Firestore Response:', response.status, response.statusText);
  if (response.status === 401) {
    console.log('✅ Firestore is reachable (401 is expected without valid auth)');
  } else if (response.status === 400) {
    console.error('❌ Firestore returning 400 - potential configuration issue');
  }
  return response.text();
})
.then(data => {
  console.log('Firestore response data:', data);
})
.catch(error => {
  console.error('Firestore error:', error);
});

// Test 3: Check current origin
console.log('Current origin:', window.location.origin);
console.log('Current hostname:', window.location.hostname);
console.log('Current protocol:', window.location.protocol);

// Test 4: Check for any CORS headers
fetch(window.location.origin + '/firebase-test.html', { method: 'HEAD' })
.then(response => {
  console.log('CORS headers check:');
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase().includes('cors') || key.toLowerCase().includes('access-control')) {
      console.log(`  ${key}: ${value}`);
    }
  }
})
.catch(error => {
  console.error('CORS check error:', error);
});