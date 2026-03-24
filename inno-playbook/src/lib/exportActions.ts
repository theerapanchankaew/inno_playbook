import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CAPS } from './data';
import { Organization } from './actions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcReadiness(deliverables: { fieldId: string; content: string }[]): number {
  const totalFields = CAPS.reduce((a, c) => a + c.deliverables.length, 0);
  const filled = CAPS.reduce(
    (a, c) =>
      a +
      c.deliverables.filter((d) =>
        deliverables.some(
          (od) => od.fieldId === d.id && od.content.trim().length > 15,
        ),
      ).length,
    0,
  );
  return Math.round((filled / totalFields) * 100);
}

function calcCapReadiness(
  capId: string,
  data: Record<string, string>,
): number {
  const cap = CAPS.find((c) => c.id === capId);
  if (!cap) return 0;
  const filled = cap.deliverables.filter(
    (d) => (data[d.id] || '').trim().length > 15,
  ).length;
  return Math.round((filled / cap.deliverables.length) * 100);
}

const NAVY = [13, 31, 60] as [number, number, number];
const TEAL = [11, 123, 116] as [number, number, number];
const LIGHT_GRAY = [240, 244, 248] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];

// ─── Export to PDF ────────────────────────────────────────────────────────────

export function exportToPDF(
  orgName: string,
  orgSector: string,
  data: Record<string, string>,
): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalDeliverables = CAPS.reduce((a, c) => a + c.deliverables.length, 0);
  const filledCount = CAPS.reduce(
    (a, c) =>
      a + c.deliverables.filter((d) => (data[d.id] || '').trim().length > 15).length,
    0,
  );
  const readiness = Math.round((filledCount / totalDeliverables) * 100);

  // ── Cover Page ──────────────────────────────────────────────────────────────
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, pageH, 'F');

  // Top accent bar
  pdf.setFillColor(...TEAL);
  pdf.rect(0, 0, pageW, 8, 'F');

  // Decorative circle
  pdf.setFillColor(11, 123, 116, 0.1 as any);
  pdf.circle(pageW - 30, pageH - 30, 60, 'F');

  // ISO badge
  pdf.setFillColor(...TEAL);
  pdf.roundedRect(20, 28, 50, 12, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MASCI · ISO 56001', 24, 36);

  // Title block
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Innovation', 20, 80);
  pdf.text('Playbook', 20, 94);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  pdf.text('ISO 56001:2024 Readiness Report', 20, 108);

  // Divider
  pdf.setDrawColor(...TEAL);
  pdf.setLineWidth(0.5);
  pdf.line(20, 118, pageW - 20, 118);

  // Org info
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const orgDisplayName = orgName || 'Unnamed Organization';
  pdf.text(orgDisplayName, 20, 132);

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  pdf.text(orgSector || 'Sector not specified', 20, 142);
  pdf.text(`Generated: ${today}`, 20, 150);

  // Readiness badge
  pdf.setFillColor(...TEAL);
  pdf.roundedRect(20, 162, 80, 28, 4, 4, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('ISO READINESS SCORE', 27, 171);
  pdf.setFontSize(22);
  pdf.text(`${readiness}%`, 27, 185);

  // Footer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text('Confidential — For Internal Use Only', 20, pageH - 12);
  pdf.text('Innovation Playbook Platform · MASCI', pageW - 20, pageH - 12, { align: 'right' });

  // ── Executive Summary Page ──────────────────────────────────────────────────
  pdf.addPage();
  pdf.setFillColor(...LIGHT_GRAY);
  pdf.rect(0, 0, pageW, pageH, 'F');

  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, 14, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('EXECUTIVE SUMMARY', 14, 9);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  pdf.text(orgDisplayName, pageW - 14, 9, { align: 'right' });

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...NAVY);
  pdf.text('Readiness Overview', 14, 30);

  // Summary table
  const summaryRows = CAPS.map((cap) => {
    const capFilled = cap.deliverables.filter(
      (d) => (data[d.id] || '').trim().length > 15,
    ).length;
    const capPct = Math.round((capFilled / cap.deliverables.length) * 100);
    const status = capPct >= 80 ? 'Strong' : capPct >= 50 ? 'In Progress' : capPct > 0 ? 'Started' : 'Not Started';
    return [cap.id, cap.name, `${capFilled}/${cap.deliverables.length}`, `${capPct}%`, status];
  });

  autoTable(pdf, {
    startY: 36,
    head: [['CAP', 'Capability Area', 'Fields Done', 'Readiness', 'Status']],
    body: summaryRows,
    theme: 'grid',
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const finalY = (pdf as any).lastAutoTable?.finalY ?? 140;

  // Overall score box
  pdf.setFillColor(...NAVY);
  pdf.roundedRect(14, finalY + 10, pageW - 28, 24, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(148, 163, 184);
  pdf.text('OVERALL ISO 56001 READINESS', 20, finalY + 20);
  pdf.setFontSize(20);
  pdf.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
  pdf.text(`${readiness}%`, 20, finalY + 30);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  pdf.text(`${filledCount} of ${totalDeliverables} deliverables completed`, pageW - 20, finalY + 26, { align: 'right' });

  // ── CAP Detail Pages ────────────────────────────────────────────────────────
  for (const cap of CAPS) {
    const capData = cap.deliverables.map((d) => ({
      label: d.lbl,
      content: (data[d.id] || '').trim() || '(not filled)',
      required: d.req ? '★' : '',
    }));

    const capFilled = cap.deliverables.filter(
      (d) => (data[d.id] || '').trim().length > 15,
    ).length;
    const capPct = Math.round((capFilled / cap.deliverables.length) * 100);

    pdf.addPage();
    pdf.setFillColor(...LIGHT_GRAY);
    pdf.rect(0, 0, pageW, pageH, 'F');

    // Header
    pdf.setFillColor(...NAVY);
    pdf.rect(0, 0, pageW, 14, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${cap.id}: ${cap.name}`, 14, 9);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text(`${capPct}% Complete · ${cap.isoRef}`, pageW - 14, 9, { align: 'right' });

    // Progress bar
    const barX = 14;
    const barY = 20;
    const barW = pageW - 28;
    const barH = 4;
    pdf.setFillColor(203, 213, 225);
    pdf.roundedRect(barX, barY, barW, barH, 2, 2, 'F');
    if (capPct > 0) {
      pdf.setFillColor(...TEAL);
      pdf.roundedRect(barX, barY, (barW * capPct) / 100, barH, 2, 2, 'F');
    }

    // Deliverables table
    const rows = capData.map((d) => [d.required, d.label, d.content]);

    autoTable(pdf, {
      startY: 30,
      head: [['Req', 'Deliverable', 'Content']],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: TEAL,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8, valign: 'top', textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: pageW - 28 - 58 },
      },
      didDrawPage: () => {
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(148, 163, 184);
        pdf.text(
          `${cap.id} — Innovation Playbook · ${orgDisplayName}`,
          14,
          pageH - 6,
        );
        pdf.text(
          `Page ${pdf.getNumberOfPages()}`,
          pageW - 14,
          pageH - 6,
          { align: 'right' },
        );
      },
    });
  }

  // Save
  const filename = `innovation-playbook-${(orgName || 'report').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

// ─── Export to Excel ──────────────────────────────────────────────────────────

export function exportToExcel(
  orgName: string,
  orgSector: string,
  data: Record<string, string>,
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows: (string | number)[][] = [
    ['Innovation Playbook — ISO 56001 Readiness Report'],
    ['Organization:', orgName || 'Unnamed'],
    ['Sector:', orgSector || 'Not specified'],
    ['Generated:', new Date().toLocaleDateString()],
    [],
    ['CAP', 'Capability Area', 'ISO Reference', 'Fields Filled', 'Total Fields', 'Readiness %'],
  ];

  let totalFilled = 0;
  let totalFields = 0;

  CAPS.forEach((cap) => {
    const filled = cap.deliverables.filter(
      (d) => (data[d.id] || '').trim().length > 15,
    ).length;
    const pct = Math.round((filled / cap.deliverables.length) * 100);
    totalFilled += filled;
    totalFields += cap.deliverables.length;
    summaryRows.push([cap.id, cap.name, cap.isoRef, filled, cap.deliverables.length, pct]);
  });

  const overallPct = Math.round((totalFilled / totalFields) * 100);
  summaryRows.push([]);
  summaryRows.push(['OVERALL', '', '', totalFilled, totalFields, overallPct]);

  const wsSum = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSum['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsSum, 'Summary');

  // Sheets 2-9: One per CAP
  CAPS.forEach((cap) => {
    const rows: (string | number)[][] = [
      [`${cap.id}: ${cap.name}`],
      ['ISO Reference:', cap.isoRef],
      [],
      ['Deliverable', 'Required', 'Content'],
    ];

    cap.deliverables.forEach((d) => {
      rows.push([d.lbl, d.req ? 'Yes' : 'No', (data[d.id] || '').trim()]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 10 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, ws, cap.id);
  });

  const filename = `innovation-playbook-${(orgName || 'report').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ─── Facilitator Report ───────────────────────────────────────────────────────

export function exportFacilitatorReport(
  orgs: Organization[],
  cohortName?: string,
): void {
  const wb = XLSX.utils.book_new();
  const totalFields = CAPS.reduce((a, c) => a + c.deliverables.length, 0);

  // Sheet 1: Cohort Overview
  const overviewRows: (string | number)[][] = [
    [`Facilitator Report — ${cohortName || 'All Organizations'}`],
    ['Generated:', new Date().toLocaleDateString()],
    ['Total Organizations:', orgs.length],
    [],
    ['Organization', 'Sector', 'Deliverables Done', 'Total Fields', 'Readiness %', ...CAPS.map((c) => c.id)],
  ];

  orgs.forEach((org) => {
    const filled = CAPS.reduce(
      (a, c) =>
        a +
        c.deliverables.filter((d) =>
          org.deliverables.some(
            (od) => od.fieldId === d.id && od.content.trim().length > 15,
          ),
        ).length,
      0,
    );
    const pct = Math.round((filled / totalFields) * 100);
    const capPcts = CAPS.map((cap) => {
      const capFilled = cap.deliverables.filter((d) =>
        org.deliverables.some(
          (od) => od.fieldId === d.id && od.content.trim().length > 15,
        ),
      ).length;
      return Math.round((capFilled / cap.deliverables.length) * 100);
    });
    overviewRows.push([org.name, org.sector || '', filled, totalFields, pct, ...capPcts]);
  });

  // Average row
  if (orgs.length > 0) {
    overviewRows.push([]);
    const avgPct =
      orgs.reduce((sum, org) => {
        const f = CAPS.reduce(
          (a, c) =>
            a +
            c.deliverables.filter((d) =>
              org.deliverables.some(
                (od) => od.fieldId === d.id && od.content.trim().length > 15,
              ),
            ).length,
          0,
        );
        return sum + Math.round((f / totalFields) * 100);
      }, 0) / orgs.length;

    const avgCapPcts = CAPS.map((cap) => {
      const capTotal = orgs.reduce((sum, org) => {
        const cf = cap.deliverables.filter((d) =>
          org.deliverables.some(
            (od) => od.fieldId === d.id && od.content.trim().length > 15,
          ),
        ).length;
        return sum + Math.round((cf / cap.deliverables.length) * 100);
      }, 0);
      return Math.round(capTotal / orgs.length);
    });

    overviewRows.push(['AVERAGE', '', '', '', Math.round(avgPct), ...avgCapPcts]);
  }

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
  wsOverview['!cols'] = [
    { wch: 40 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    ...CAPS.map(() => ({ wch: 8 })),
  ];
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Cohort Overview');

  // Sheet 2: Detailed per-CAP breakdown
  const detailRows: (string | number)[][] = [
    ['Detailed CAP Breakdown'],
    [],
    ['Organization', 'Sector', ...CAPS.flatMap((c) => c.deliverables.map((d) => `${c.id}: ${d.lbl}`))],
  ];

  orgs.forEach((org) => {
    const row: (string | number)[] = [org.name, org.sector || ''];
    CAPS.forEach((cap) => {
      cap.deliverables.forEach((d) => {
        const deliv = org.deliverables.find((od) => od.fieldId === d.id);
        row.push(deliv?.content?.trim() || '');
      });
    });
    detailRows.push(row);
  });

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [
    { wch: 40 },
    { wch: 20 },
    ...CAPS.flatMap((c) => c.deliverables.map(() => ({ wch: 30 }))),
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Deliverable Details');

  const filename = `facilitator-report-${(cohortName || 'all-orgs').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}
