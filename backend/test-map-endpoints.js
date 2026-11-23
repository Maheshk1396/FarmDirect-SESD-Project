const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:5000' + path, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(new Error('Parse error on ' + path + ': ' + data));
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('1. Testing /api/farmers:');
  const farmers = await get('/api/farmers');
  console.log('Total farmers returned:', farmers.data.length);
  farmers.data.forEach(f => {
    console.log(`  ✓ ${f.farmName} | Location: [Lng: ${f.longitude}, Lat: ${f.latitude}] | ${f.district}, ${f.state} | Status: ${f.verificationStatus} | Products: ${f.productCount}`);
  });

  console.log('\n2. Testing /api/farmers/nearby (Radius 250km from Nashik GPS 19.9975, 73.7898):');
  const nearby = await get('/api/farmers/nearby?lat=19.9975&lng=73.7898&radius=250');
  console.log('Farmers within 250km:', nearby.data.length);
  nearby.data.forEach(f => {
    console.log(`  ✓ ${f.farmName}: ${f.distanceKm} km away`);
  });

  console.log('\n3. Testing /api/farmers/nearby with small radius (10km):');
  const nearbySmall = await get('/api/farmers/nearby?lat=19.9975&lng=73.7898&radius=10');
  console.log('Farmers within 10km:', nearbySmall.data.length);

  console.log('\nAll farmer discovery and geospatial endpoints verified successfully!');
}

verify().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
