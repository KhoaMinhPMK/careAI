/* ═══════════════════════════════════════════
   CareAI Dashboard – v3.0
   ═══════════════════════════════════════════ */

async function loadDashboard() {
  try {
    // Fetch both endpoints
    const [statsRes, alertsRes] = await Promise.all([
      apiGet('/dashboard/stats'),
      apiGet('/dashboard/recent-alerts')
    ]);

    const data = statsRes;
    const s = data.summary || {};

    // Stats
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-patients', s.total_patients ?? '-');
    set('stat-obs', s.total_observations ?? '-');
    set('stat-alerts', s.active_alerts ?? '-');
    set('stat-quality', s.avg_data_quality ? `${Math.round(s.avg_data_quality * 100)}%` : '-');

    // Charts
    renderSeverityChart(data.severity_distribution);
    renderRiskChart(data.risk_distribution);
    renderAlertTypesChart(data.alert_types);
    renderWardChart(data.ward_distribution);

    // Recent alerts
    renderRecentAlerts((alertsRes && alertsRes.alerts) || []);
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}

function renderSeverityChart(dist) {
  if (!dist || Object.keys(dist).length === 0) return;
  const ctx = document.getElementById('chart-severity');
  if (!ctx) return;
  const labels = Object.keys(dist);
  const values = Object.values(dist);
  const colors = {
    critical: '#DC2626', high: '#EA580C', warning: '#CA8A04',
    info: '#2563EB', moderate: '#CA8A04', low: '#059669'
  };
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(l => I18N.t('severity.' + l, l)),
      datasets: [{ data: values, backgroundColor: labels.map(l => colors[l] || '#94A3B8'), borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#64748B', font: { family: 'Inter', size: 12 }, padding: 14 } } }
    }
  });
}

function renderRiskChart(dist) {
  if (!dist || Object.keys(dist).length === 0) return;
  const ctx = document.getElementById('chart-risk');
  if (!ctx) return;
  const labels = Object.keys(dist);
  const values = Object.values(dist);
  const colors = { critical: '#DC2626', high: '#EA580C', moderate: '#CA8A04', low: '#059669', unknown: '#94A3B8' };
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(l => I18N.t('severity.' + l, l)),
      datasets: [{ data: values, backgroundColor: labels.map(l => colors[l] || '#94A3B8'), borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#64748B', font: { family: 'Inter', size: 12 }, padding: 14 } } }
    }
  });
}

function renderAlertTypesChart(types) {
  if (!types || types.length === 0) return;
  const ctx = document.getElementById('chart-alert-types');
  if (!ctx) return;
  let labels, values;
  if (Array.isArray(types)) {
    labels = types.map(t => t.alert_type || t.type || t.name);
    values = types.map(t => t.count || t.value);
  } else {
    labels = Object.keys(types);
    values = Object.values(types);
  }
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: '#DBEAFE', borderColor: '#0F6FDE', borderWidth: 1, borderRadius: 4 }]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94A3B8', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
        y: { ticks: { color: '#64748B', font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

function renderWardChart(wards) {
  if (!wards || wards.length === 0) return;
  const ctx = document.getElementById('chart-ward');
  if (!ctx) return;
  let labels, values;
  if (Array.isArray(wards)) {
    labels = wards.map(w => w.ward || w.name);
    values = wards.map(w => w.count || w.value);
  } else {
    labels = Object.keys(wards);
    values = Object.values(wards);
  }
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: '#D1FAE5', borderColor: '#059669', borderWidth: 1, borderRadius: 4 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#64748B', font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: '#94A3B8', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' }, beginAtZero: true }
      }
    }
  });
}

function renderRecentAlerts(alerts) {
  const feed = document.getElementById('alert-feed');
  if (!feed) return;
  if (!alerts.length) {
    feed.innerHTML = `<div class="empty-state"><h3>${I18N.t('dashboard.noAlerts', 'Không có cảnh báo')}</h3><p>${I18N.t('dashboard.allPassed', 'Tất cả kiểm tra đều đạt')}</p></div>`;
    return;
  }
  feed.innerHTML = alerts.slice(0, 10).map(a => {
    const sev = (a.severity || 'info').toLowerCase();
    return `<div class="alert-item ${sev}" onclick="window.location.href='patient-detail.html?id=${a.patient_id || ''}'">
      <span class="severity-dot ${sev}"></span>
      <div class="alert-body">
        <div class="alert-type">${a.alert_type || '-'}</div>
        <div class="alert-msg">${a.message || '-'}</div>
        <div class="alert-patient">${a.patient_name || ''} ${a.medical_record_number ? '(' + a.medical_record_number + ')' : ''}</div>
      </div>
      <span class="severity-badge ${sev}">${I18N.t('severity.' + sev, sev)}</span>
    </div>`;
  }).join('');
}
