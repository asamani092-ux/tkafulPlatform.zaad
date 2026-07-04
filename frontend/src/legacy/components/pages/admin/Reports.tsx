import { useState, useEffect } from 'react';
import {
    FileText, Download, Trash2, Eye, Calendar, Plus, BarChart3,
    FolderKanban, Users, CheckSquare, Target, DollarSign, Clock, Lightbulb, Percent, FileSpreadsheet
} from 'lucide-react';
import AdminLayout from '../../layout/AdminLayout';
import { useAuth } from '../../../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../../config';

interface Report {
    id: number;
    title: string;
    admin_name: string;
    admin_email: string;
    date_from: string | null;
    date_to: string | null;
    total_projects: number;
    total_volunteers: number;
    total_tasks: number;
    total_beneficiaries: number;
    total_donations: string;
    generated_at: string;
    report_data: any;
}

export default function Reports() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewingReport, setViewingReport] = useState<Report | null>(null);

    // ✅ Use AuthContext hook instead of localStorage directly
    const { access } = useAuth();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/reports/`, {
                headers: { 'Authorization': `Bearer ${access}` }
            });
            if (response.ok) {
                const data = await response.json();
                setReports(data.results || []);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        setGenerating(true);
        try {
            const payload: any = {};
            if (dateFrom) payload.date_from = dateFrom;
            if (dateTo) payload.date_to = dateTo;

            const response = await fetch(`${API_BASE_URL}/api/admin/reports/generate/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                fetchReports();
                setDateFrom('');
                setDateTo('');
            } else {
                alert('حدث خطأ أثناء إنشاء التقرير');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            alert('حدث خطأ أثناء إنشاء التقرير');
        } finally {
            setGenerating(false);
        }
    };

    const handleDeleteReport = async (reportId: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا التقرير؟')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/reports/${reportId}/delete/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${access}` }
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                fetchReports();
            }
        } catch (error) {
            console.error('Error deleting report:', error);
        }
    };

    const handleViewReport = (report: Report) => {
        setViewingReport(report);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ✅ Export to PDF (Professional format with proper styling)
    const exportToPDF = (report: Report) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header with branding
        doc.setFillColor(141, 46, 70);
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('منصة تكافل', pageWidth / 2, 15, { align: 'center' });

        doc.setFontSize(16);
        doc.text('ملخص التقرير', pageWidth / 2, 25, { align: 'center' });

        doc.setFontSize(10);
        doc.text(`تاريخ الإنشاء: ${new Date(report.generated_at).toLocaleDateString('ar-SA')}`, pageWidth / 2, 33, { align: 'center' });

        // Reset text color
        doc.setTextColor(0, 0, 0);

        // Summary section
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('الملخص التنفيذي', 20, 55);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const summaryData = [
            ['إجمالي المشاريع', report.total_projects.toString()],
            ['إجمالي المتطوعين', report.total_volunteers.toString()],
            ['إجمالي المهام', report.total_tasks.toString()],
            ['إجمالي المستفيدين', report.total_beneficiaries.toLocaleString()],
            ['إجمالي التبرعات', `${parseFloat(report.total_donations).toLocaleString()} ريال`],
        ];

        autoTable(doc, {
            startY: 60,
            head: [['المؤشر', 'القيمة']],
            body: summaryData,
            theme: 'striped',
            headStyles: {
                fillColor: [141, 46, 70],
                fontSize: 11,
                fontStyle: 'bold',
                halign: 'right'
            },
            bodyStyles: { fontSize: 10, halign: 'right' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
        });

        // Projects by status
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const yPos = (doc as any).lastAutoTable.finalY + 15;
        doc.text('المشاريع حسب الحالة', 20, yPos);

        doc.setFont('helvetica', 'normal');

        const statusData = [
            ['نشط', report.report_data.projects.by_status.active.toString()],
            ['مكتمل', report.report_data.projects.by_status.completed.toString()],
            ['متوقف', report.report_data.projects.by_status.planned.toString()],
            ['ملغي', report.report_data.projects.by_status.cancelled.toString()],
        ];

        autoTable(doc, {
            startY: yPos + 5,
            head: [['الحالة', 'العدد']],
            body: statusData,
            theme: 'striped',
            headStyles: {
                fillColor: [141, 46, 70],
                fontSize: 11,
                fontStyle: 'bold',
                halign: 'right'
            },
            bodyStyles: { fontSize: 10, halign: 'right' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
        });

        // Projects list (new page)
        if (report.report_data.projects.list && report.report_data.projects.list.length > 0) {
            doc.addPage();

            // Header on new page
            doc.setFillColor(141, 46, 70);
            doc.rect(0, 0, pageWidth, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.text('تفاصيل المشاريع', pageWidth / 2, 15, { align: 'center' });
            doc.setTextColor(0, 0, 0);

            const projectsData = report.report_data.projects.list.slice(0, 20).map((project: any, index: number) => [
                (index + 1).toString(),
                project.title || `مشروع ${index + 1}`,
                project.category || '-',
                project.status === 'ACTIVE' ? 'نشط' :
                project.status === 'COMPLETED' ? 'مكتمل' :
                project.status === 'PLANNED' ? 'متوقف' : 'ملغي',
                `${project.progress}%`,
                project.volunteers_assigned.toString(),
                `${project.tasks_completed}/${project.tasks_total}`,
            ]);

            autoTable(doc, {
                startY: 35,
                head: [['#', 'اسم المشروع', 'الفئة', 'الحالة', 'التقدم', 'المتطوعين', 'المهام']],
                body: projectsData,
                theme: 'striped',
                headStyles: {
                    fillColor: [141, 46, 70],
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'right'
                },
                bodyStyles: { fontSize: 8, halign: 'right' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },   // #
                    1: { cellWidth: 50 },   // اسم المشروع
                    2: { cellWidth: 30 },   // الفئة
                    3: { cellWidth: 20 },   // الحالة
                    4: { cellWidth: 20 },   // التقدم
                    5: { cellWidth: 25 },   // المتطوعين
                    6: { cellWidth: 20 },   // المهام
                },
            });
        }

        // Footer on all pages
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `منصة تكافل - صفحة ${i} من ${pageCount}`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        // Save the PDF
        const fileName = `تقرير_تكافل_${Date.now()}.pdf`;
        doc.save(fileName);
    };

    // ✅ Export to Excel (Professional format with proper styling)
    const exportToExcel = (report: Report) => {
        const workbook = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = [
            ['منصة تكافل - ملخص التقرير'],
            [''],
            ['معلومات التقرير'],
            ['تم الإنشاء بواسطة:', report.admin_name],
            ['تاريخ الإنشاء:', new Date(report.generated_at).toLocaleString('ar-SA')],
            [''],
            ['الملخص التنفيذي'],
            ['المؤشر', 'القيمة'],
            ['إجمالي المشاريع', report.total_projects],
            ['إجمالي المتطوعين', report.total_volunteers],
            ['إجمالي المهام', report.total_tasks],
            ['إجمالي المستفيدين', report.total_beneficiaries],
            ['إجمالي التبرعات (ريال)', parseFloat(report.total_donations).toFixed(2)],
            [''],
            ['المشاريع حسب الحالة'],
            ['الحالة', 'العدد'],
            ['نشط', report.report_data.projects.by_status.active],
            ['مكتمل', report.report_data.projects.by_status.completed],
            ['متوقف', report.report_data.projects.by_status.planned],
            ['ملغي', report.report_data.projects.by_status.cancelled],
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

        // Set column widths
        summarySheet['!cols'] = [{ wch: 35 }, { wch: 25 }];

        // Merge cells for headers
        if (!summarySheet['!merges']) summarySheet['!merges'] = [];
        summarySheet['!merges'].push(
            { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Title
            { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, // Report Info header
            { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } }, // Executive Summary header
            { s: { r: 14, c: 0 }, e: { r: 14, c: 1 } } // Projects by Status header
        );

        XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص');

        // Projects sheet
        if (report.report_data.projects.list && report.report_data.projects.list.length > 0) {
            const projectsData = report.report_data.projects.list.map((project: any, index: number) => ({
                'الرقم': index + 1,
                'اسم المشروع': project.title || `مشروع ${index + 1}`,
                'الفئة': project.category || '-',
                'الحالة': project.status === 'ACTIVE' ? 'نشط' :
                          project.status === 'COMPLETED' ? 'مكتمل' :
                          project.status === 'PLANNED' ? 'متوقف' : 'ملغي',
                'نسبة الإنجاز': project.progress + '%',
                'عدد المتطوعين': project.volunteers_assigned,
                'المهام المكتملة': project.tasks_completed,
                'إجمالي المهام': project.tasks_total,
                'نسبة إتمام المهام': project.tasks_total > 0 ?
                    Math.round((project.tasks_completed / project.tasks_total) * 100) + '%' : '0%',
                'المستفيدون': project.beneficiaries,
                'التبرعات (ريال)': parseFloat(project.donation_amount || 0).toFixed(2),
                'تاريخ البدء': project.start_date || '-',
                'تاريخ الانتهاء': project.end_date || '-',
            }));

            const projectsSheet = XLSX.utils.json_to_sheet(projectsData);

            // Set column widths
            projectsSheet['!cols'] = [
                { wch: 8 },   // الرقم
                { wch: 35 },  // اسم المشروع
                { wch: 20 },  // الفئة
                { wch: 12 },  // الحالة
                { wch: 14 },  // نسبة الإنجاز
                { wch: 16 },  // عدد المتطوعين
                { wch: 16 },  // المهام المكتملة
                { wch: 16 },  // إجمالي المهام
                { wch: 18 },  // نسبة إتمام المهام
                { wch: 14 },  // المستفيدون
                { wch: 18 },  // التبرعات
                { wch: 16 },  // تاريخ البدء
                { wch: 16 },  // تاريخ الانتهاء
            ];

            XLSX.utils.book_append_sheet(workbook, projectsSheet, 'المشاريع');
        }

        // Volunteers sheet
        if (report.report_data.volunteers && report.report_data.volunteers.length > 0) {
            const volunteersData = report.report_data.volunteers.map((volunteer: any, index: number) => ({
                'الرقم': index + 1,
                'اسم المتطوع': volunteer.name || `متطوع ${index + 1}`,
                'البريد الإلكتروني': volunteer.email,
                'المهام المكتملة': volunteer.tasks_completed,
                'إجمالي الساعات': volunteer.total_hours,
                'متوسط الساعات لكل مهمة': volunteer.tasks_completed > 0 ?
                    (volunteer.total_hours / volunteer.tasks_completed).toFixed(1) : '0',
                'الحالة': volunteer.tasks_completed > 0 ? 'نشط' : 'غير نشط',
            }));

            const volunteersSheet = XLSX.utils.json_to_sheet(volunteersData);

            // Set column widths
            volunteersSheet['!cols'] = [
                { wch: 8 },   // الرقم
                { wch: 25 },  // اسم المتطوع
                { wch: 30 },  // البريد الإلكتروني
                { wch: 18 },  // المهام المكتملة
                { wch: 18 },  // إجمالي الساعات
                { wch: 25 },  // متوسط الساعات لكل مهمة
                { wch: 14 },  // الحالة
            ];

            XLSX.utils.book_append_sheet(workbook, volunteersSheet, 'المتطوعون');
        }

        // Save the Excel file
        const fileName = `تقرير_تكافل_${Date.now()}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    if (viewingReport) {
        return (
            <AdminLayout>
                <div className="space-y-6 overflow-x-hidden">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{viewingReport.title}</h1>
                            <p className="text-gray-600 mt-2">تم الإنشاء: {formatDate(viewingReport.generated_at)}</p>
                        </div>
                        <div className="flex gap-3">
                            {/* Export to PDF - Disabled for Arabic */}
                            <button
                                disabled
                                className="px-4 py-2 bg-gray-300 text-gray-500 rounded-xl cursor-not-allowed flex items-center gap-2 opacity-60"
                                title="التصدير بصيغة PDF غير مدعوم للنصوص العربية - استخدم Excel"
                            >
                                <FileText className="w-4 h-4" />
                                <span>PDF</span>
                            </button>

                            {/* Export to Excel */}
                            <button
                                onClick={() => exportToExcel(viewingReport)}
                                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 transition-colors"
                                title="تصدير كـ Excel"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                <span>Excel</span>
                            </button>

                            {/* Back button */}
                            <button
                                onClick={() => setViewingReport(null)}
                                className="px-6 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
                            >
                                رجوع
                            </button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-2xl shadow">
                            <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                                <FolderKanban className="w-4 h-4" />
                                <p>إجمالي المشاريع</p>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{viewingReport.total_projects}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow">
                            <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                                <Users className="w-4 h-4" />
                                <p>إجمالي المتطوعين</p>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{viewingReport.total_volunteers}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow">
                            <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                                <CheckSquare className="w-4 h-4" />
                                <p>إجمالي المهام</p>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{viewingReport.total_tasks}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow">
                            <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                                <Target className="w-4 h-4" />
                                <p>إجمالي المستفيدين</p>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{viewingReport.total_beneficiaries.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow">
                            <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                                <DollarSign className="w-4 h-4" />
                                <p>إجمالي التبرعات</p>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{parseFloat(viewingReport.total_donations).toLocaleString()} ر.س</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow">
                            <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                                <Clock className="w-4 h-4" />
                                <p>ساعات التطوع</p>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{viewingReport.report_data.summary.total_volunteer_hours.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Projects Section */}
                    <div className="bg-white p-6 rounded-2xl shadow">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FolderKanban className="w-6 h-6" />
                            المشاريع
                        </h2>

                        {/* Projects by Status */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3">حسب الحالة</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-green-50 rounded-xl">
                                    <p className="text-sm text-gray-600">نشطة</p>
                                    <p className="text-2xl font-bold text-green-600">{viewingReport.report_data.projects.by_status.active}</p>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-xl">
                                    <p className="text-sm text-gray-600">مكتملة</p>
                                    <p className="text-2xl font-bold text-blue-600">{viewingReport.report_data.projects.by_status.completed}</p>
                                </div>
                                <div className="text-center p-4 bg-yellow-50 rounded-xl">
                                    <p className="text-sm text-gray-600">متوقفة</p>
                                    <p className="text-2xl font-bold text-yellow-600">{viewingReport.report_data.projects.by_status.planned}</p>
                                </div>
                                <div className="text-center p-4 bg-red-50 rounded-xl">
                                    <p className="text-sm text-gray-600">ملغاة</p>
                                    <p className="text-2xl font-bold text-red-600">{viewingReport.report_data.projects.by_status.cancelled}</p>
                                </div>
                            </div>
                        </div>

                        {/* Top Projects */}
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-3">تفاصيل المشاريع</h3>
                            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" />
                                نسبة الإنجاز محسوبة تلقائياً من المهام المكتملة (المهام المكتملة ÷ إجمالي المهام)
                            </p>
                            <div className="w-full overflow-x-auto">
                                <table className="w-full min-w-[820px]">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-right text-sm font-semibold">اسم المشروع</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold">الفئة</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold">الحالة</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold">نسبة الإنجاز</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold">المتطوعين</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold">المهام</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {viewingReport.report_data.projects.list.slice(0, 10).map((project: any) => (
                                            <tr key={project.id}>
                                                <td className="px-4 py-3 text-sm">{project.title}</td>
                                                <td className="px-4 py-3 text-sm">{project.category}</td>
                                                <td className="px-4 py-3 text-sm">{project.status_display}</td>
                                                <td className="px-4 py-3 text-sm">{project.progress}%</td>
                                                <td className="px-4 py-3 text-sm">{project.volunteers_assigned}</td>
                                                <td className="px-4 py-3 text-sm">{project.tasks_completed}/{project.tasks_total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Tasks Section */}
                    <div className="bg-white p-6 rounded-2xl shadow">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <CheckSquare className="w-6 h-6" />
                            المهام
                        </h2>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded-xl">
                                <p className="text-sm text-gray-600">قيد التنفيذ</p>
                                <p className="text-2xl font-bold text-blue-600">{viewingReport.report_data.tasks.by_status.in_progress}</p>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-xl">
                                <p className="text-sm text-gray-600">في الانتظار</p>
                                <p className="text-2xl font-bold text-yellow-600">{viewingReport.report_data.tasks.by_status.waiting}</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-xl">
                                <p className="text-sm text-gray-600">مكتملة</p>
                                <p className="text-2xl font-bold text-green-600">{viewingReport.report_data.tasks.by_status.completed}</p>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-xl">
                                <p className="text-sm text-gray-600">معلقة</p>
                                <p className="text-2xl font-bold text-red-600">{viewingReport.report_data.tasks.by_status.on_hold}</p>
                            </div>
                        </div>

                        <div className="mt-4 text-center p-4 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-600">نسبة الإنجاز الإجمالية</p>
                            <p className="text-3xl font-bold text-gray-800">{viewingReport.report_data.tasks.completion_rate}%</p>
                        </div>
                    </div>

                    {/* Volunteers Summary */}
                    <div className="bg-white p-6 rounded-2xl shadow">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Users className="w-6 h-6" />
                            المتطوعون
                        </h2>
                        <p className="text-lg text-gray-600">إجمالي المتطوعين النشطين: <span className="font-bold">{viewingReport.report_data.volunteers.total}</span></p>
                        <p className="text-sm text-gray-500 mt-2">عرض قائمة المتطوعين متاح في التقرير الكامل</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6 overflow-x-hidden">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <FileText className="w-8 h-8" />
                            التقارير
                        </h1>
                        <p className="text-gray-600 mt-2">إنشاء وعرض التقارير الشاملة للمنصة</p>
                    </div>
                </div>

                {/* Generate Report Section */}
                <div className="bg-white p-3 sm:p-6 rounded-2xl shadow overflow-x-hidden">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        إنشاء تقرير جديد
                    </h2>
                    <div className="flex flex-col gap-4 sm:gap-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4 inline ml-1" />
                                    من تاريخ (اختياري)
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ab686f]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4 inline ml-1" />
                                    إلى تاريخ (اختياري)
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ab686f]"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleGenerateReport}
                            disabled={generating}
                            className="w-full sm:w-auto px-8 py-2 bg-[#ab686f] text-white rounded-xl hover:bg-[#9a5860] disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                            <BarChart3 className="w-5 h-5" />
                            {generating ? 'جاري الإنشاء...' : 'إنشاء تقرير'}
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        اترك التواريخ فارغة للحصول على تقرير شامل لجميع البيانات
                    </p>
                </div>

                {/* Reports List */}
                <div className="bg-white p-3 sm:p-6 rounded-2xl shadow overflow-x-hidden">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">التقارير المحفوظة</h2>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ab686f] mx-auto"></div>
                            <p className="text-gray-600 mt-4">جاري التحميل...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="min-h-[180px] sm:min-h-[260px] flex flex-col items-center justify-center text-center gap-3">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">لا توجد تقارير محفوظة</p>
                            <p className="text-sm text-gray-500">قم بإنشاء تقرير جديد للبدء</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reports.map((report) => (
                                <div
                                    key={report.id}
                                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-[#ab686f]" />
                                                {report.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                تم الإنشاء: {formatDate(report.generated_at)}
                                            </p>
                                            <div className="flex flex-wrap gap-3 sm:gap-6 mt-3 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <FolderKanban className="w-4 h-4" />
                                                    مشاريع: {report.total_projects}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    متطوعين: {report.total_volunteers}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <CheckSquare className="w-4 h-4" />
                                                    مهام: {report.total_tasks}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Target className="w-4 h-4" />
                                                    مستفيدين: {report.total_beneficiaries.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 self-end sm:self-start">
                                            <button
                                                onClick={() => handleViewReport(report)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="عرض التقرير"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                disabled
                                                className="p-2 text-gray-400 cursor-not-allowed rounded-lg opacity-50"
                                                title="التصدير بصيغة PDF غير مدعوم للنصوص العربية - استخدم Excel"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => exportToExcel(report)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                                title="تصدير Excel"
                                            >
                                                <FileSpreadsheet className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteReport(report.id)}
                                                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                                                title="حذف التقرير"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
