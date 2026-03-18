/* ═══════════════════════════════════════════
   CareAI Patients List – v3.0
   Maps to: GET /api/patients → { patients: [...], total }
   ═══════════════════════════════════════════ */

let allPatients = [];

async function loadPatients() {
  try {
    const data = await apiGet('/patients');
    // API returns { patients: [...], total: N }
    allPatients = (data && data.patients) ? data.patients : (Array.isArray(data) ? data : []);
    renderPatientTable(allPatients);
    setupFilters();
  } catch (e) {
    console.error('Failed to load patients:', e);
  }
}

function renderPatientTable(patients) {
  const tbody = document.getElementById('patient-table');
  if (!tbody) return;

  if (!patients.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><h3>${I18N.t('patients.noPatients', 'Không tìm thấy bệnh nhân')}</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = patients.map(p => {
    const risk = (p.risk_level || 'low').toLowerCase();
    const dq = p.avg_dq_score != null ? Math.round(p.avg_dq_score * 100) : null;
    const dqClass = dq !== null ? (dq >= 80 ? 'good' : dq >= 60 ? 'moderate' : 'poor') : '';
    const alertCount = p.active_alerts ?? 0;
    const age = p.date_of_birth ? I18N.formatAge(p.date_of_birth) : '-';
    const initials = (p.name || '--').split(' ').map(w => w.charAt(0)).join('').slice(0, 2);

    return `<tr onclick="window.location.href='patient-detail.html?id=${p.id}'">
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:6px;background:var(--accent-primary);color:white;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;flex-shrink:0;">${initials}</div>
          <span class="patient-name">${p.name || '-'}</span>
        </div>
      </td>
      <td><span class="mrn">${p.medical_record_number || '-'}</span></td>
      <td>${age}</td>
      <td>${p.ward || '-'}</td>
      <td><span class="severity-badge ${risk}">${I18N.t('severity.' + risk, risk)}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-weight:600;font-size:0.82rem;">${dq !== null ? dq + '%' : '-'}</span>
          ${dq !== null ? `<div class="dq-bar"><div class="dq-bar-fill ${dqClass}" style="width:${dq}%"></div></div>` : ''}
        </div>
      </td>
      <td><span style="font-weight:600;color:${alertCount > 3 ? 'var(--severity-critical)' : alertCount > 0 ? 'var(--severity-warning)' : 'var(--accent-emerald)'}">${alertCount}</span></td>
    </tr>`;
  }).join('');
}

function setupFilters() {
  const search = document.getElementById('search-input');
  const riskFilter = document.getElementById('risk-filter');

  const filter = () => {
    let filtered = [...allPatients];
    const q = (search?.value || '').toLowerCase();
    const r = riskFilter?.value || '';

    if (q) {
      filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(q) || (p.medical_record_number || '').toLowerCase().includes(q));
    }
    if (r) {
      filtered = filtered.filter(p => (p.risk_level || '').toLowerCase() === r);
    }
    renderPatientTable(filtered);
  };

  if (search) search.addEventListener('input', filter);
  if (riskFilter) riskFilter.addEventListener('change', filter);
}
