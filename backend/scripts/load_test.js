import http from 'k6/http';
import { check, sleep } from 'k6';
import ws from 'k6/ws';

export const options = {
    scenarios: {
        // 1. API Throughput (Read-heavy)
        api_throughput: {
            executor: 'constant-vus',
            vus: 50,
            duration: '30s',
            exec: 'test_api',
        },
        // 2. Concurrent Bookings (Write-heavy contention)
        concurrent_bookings: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 20 },
                { duration: '20s', target: 20 },
                { duration: '10s', target: 0 },
            ],
            exec: 'test_bookings',
        },
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000/api/v1';
const WS_URL = __ENV.WS_URL || 'ws://localhost:8000/api/v1/ws';
// Provide a valid token via environment variable for tests
const TOKEN = __ENV.TOKEN || 'test_token';

// Utility to get authenticated headers
const params = {
    headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
    },
};

export function test_api() {
    const res = http.get(`${BASE_URL}/projects`, params);
    check(res, {
        'status is 200': (r) => r.status === 200,
        'transaction time < 200ms': (r) => r.timings.duration < 200,
    });
    sleep(1);
}

export function test_bookings() {
    // Simulating multiple agents trying to hit the booking endpoint simultaneously
    const payload = JSON.stringify({
        lead_id: 1,
        unit_id: 1,
        customer_id: 1,
        total_cost: 5000000
    });

    const res = http.post(`${BASE_URL}/bookings/`, payload, params);

    // We expect either 200 (Success) or 400 (Unit is no longer available -> handled contention)
    // If it's a 500, it means a race condition caused a DB error, which is a test failure.
    check(res, {
        'status is 200 or 400 (contention handled)': (r) => r.status === 200 || r.status === 400,
        'status is NOT 500': (r) => r.status !== 500,
    });
    sleep(0.5);
}
