import AdminLayout from "../../layout/AdminLayout";
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from "react-icons/fi";
import { Eye, EyeOff, ChevronLeft, Users, SquarePen, FolderOpen, FileText, HandCoins, ChevronDown, ChevronUp, CalendarDays, MapPin, User, Clock, AlertTriangle, X, Check, Upload } from "lucide-react";
import Modal from "../../ui/Modal";
import { useAuth } from "../../../contexts/AuthContext";
import { API_BASE_URL } from "../../../config";
import { useDashboardSettings } from "../../../contexts/useDashboardSettings";


interface Project {
    id: number;
    title: string;
    description: string;
    desc?: string;
    beneficiaries: number;
    donations?: number;
    donation_amount?: number;
    progress: number;
    supervisor?: string;
    tags?: string[];
    date?: string;
    start_date?: string;
    end_date?: string;
    organization?: string;
    location?: string;
    hours?: string;
    estimated_hours?: number;
    budget?: string;
    status?: string;
    status_display?: string;
    is_hidden?: boolean;
    category?: string;
    target_audience?: string;
}

type EditableDashboardKey =
    | 'showDashboard'
    | 'showKPIs'
    | 'showDonut'
    | 'showVolunteerBars'
    | 'showTopVolunteers';

type DraftDashboardSettings = Record<EditableDashboardKey, boolean>;


// Project Status Dropdown Component
// Project Status Dropdown Component - FIXED VERSION
function ProjectStatusDropdown({ currentStatus, onStatusChange }: { currentStatus: string; onStatusChange: (status: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    const statuses = [
        { value: "نشط", label: "نشط" },
        { value: "متوقف", label: "متوقف" },
        { value: "مكتمل", label: "مكتمل" },
        { value: "ملغي", label: "ملغي" }
    ];

    return (
        <div className="relative" dir="rtl">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full max-w-[180px] sm:max-w-[200px] items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-[#6F1A28] rounded-[8px] sm:rounded-[8px] md:rounded-[20px] shadow-sm hover:shadow-md transition-shadow"
                aria-label="اختيار حالة المشروع"
            >
                {/* ✅ FIXED: Changed from "حالة المشروع" to {currentStatus} */}
                <span className="text-[#6F1A28] font-bold text-[11px] sm:text-[12px] md:text-[13px] font-[Cairo]">
                    {currentStatus}
                </span>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#6F1A28]" />
                ) : (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-[#6F1A28]" />
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-[16px] sm:rounded-[18px] md:rounded-[20px] shadow-lg border-2 border-[#A97D84] overflow-hidden z-50">
                    {statuses.map((status) => (
                        <button
                            key={status.value}
                            onClick={() => {
                                onStatusChange(status.value);
                                setIsOpen(false);
                            }}
                            className={`
                                w-full px-3 sm:px-4 py-2.5 sm:py-3 text-right
                                text-[#6F1A28] font-medium text-[11px] sm:text-[12px] md:text-[13px] font-[Cairo]
                                bg-white
                                ${currentStatus === status.value ? 'font-bold bg-[#F3E3E3]' : ''}
                                hover:bg-[#F3E3E3] transition-colors
                                first:rounded-t-[14px] sm:first:rounded-t-[16px] md:first:rounded-t-[18px]
                                last:rounded-b-[14px] sm:last:rounded-b-[16px] md:last:rounded-b-[18px]
                            `}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Project Card Component
function ProjectCard({ project, showProgress = false, isCompleted = false, onDetailsClick, onApprove, onReject }: { project: any; showProgress?: boolean; isCompleted?: boolean; onDetailsClick?: () => void; onApprove?: () => void; onReject?: () => void }) {
    // For finished and active projects, use the new design matching the image
    if (showProgress) {
        return (
            <div className="bg-white rounded-[16px] sm:rounded-[18px] md:rounded-[20px] p-4 sm:p-5 md:p-6 shadow-md border border-gray-200" dir="rtl">
                {/* Title - Dark red/maroon at top right */}
                <h3 className="text-[#6F1A28] font-bold text-[16px] sm:text-[17px] md:text-[18px] lg:text-[19px] mb-3 font-[Cairo] text-right">
                    {project.title}
                </h3>

                {/* Organization Name - Dark gray */}
                {project.organization && (
                    <p className="text-gray-700 text-[13px] sm:text-[14px] md:text-[15px] mb-2 font-[Cairo] text-right">
                        {project.organization}
                    </p>
                )}

                {/* Description - Dark gray */}
                <p className="text-gray-700 text-[12px] sm:text-[13px] md:text-[14px] mb-4 leading-relaxed font-[Cairo] text-right">
                    {project.description || project.desc}
                </p>

                {/* Progress Section */}
                {showProgress && project.progress !== undefined && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-gray-700 text-[12px] sm:text-[13px] md:text-[14px] font-[Cairo]">
                                التقدم
                            </p>
                            <span className="text-gray-700 text-[13px] sm:text-[14px] md:text-[15px] font-[Cairo]">
                                %{project.progress}
                            </span>
                        </div>
                        <div className="bg-gray-300 rounded-full h-2.5 sm:h-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${isCompleted ? 'bg-[#8D2E46]' : 'bg-yellow-400'}`}
                                style={{ width: `${project.progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Footer Metadata - 4 items with icons, arranged right to left */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1 justify-center">
                    {/* Calendar */}
                    {(project.date || project.start_date) && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 text-[11px] sm:text-[12px] md:text-[13px] font-[Cairo]">
                            <CalendarDays className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-600" />
                            <span>{project.date || project.start_date}</span>
                        </div>
                    )}

                    {/* Location */}
                    {project.location && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 text-[11px] sm:text-[12px] md:text-[13px] font-[Cairo]">
                            <MapPin className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-600" />
                            <span>{project.location}</span>
                        </div>
                    )}

                    {/* Supervisor/Person */}
                    {project.supervisor && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 text-[11px] sm:text-[12px] md:text-[13px] font-[Cairo]">
                            <User className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-600" />
                            <span>{project.supervisor}</span>
                        </div>
                    )}

                    {/* Hours/Clock */}
                    {(project.hours || project.estimated_hours) && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 text-[11px] sm:text-[12px] md:text-[13px] font-[Cairo]">
                            <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-600" />
                            <span>{project.hours || `${project.estimated_hours} ساعة`}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // For project ideas, match the image design exactly
    return (
        <div className="bg-white rounded-[16px] sm:rounded-[18px] md:rounded-[20px] p-4 sm:p-5 md:p-6 shadow-md border border-gray-200" dir="rtl">
            {/* Top Section: Title on right, Buttons on left */}
            <div className="flex items-start justify-between gap-4 mb-3">
                {/* Title Section - Right side */}
                <div className="flex-1">
                    <h3 className="text-[#6F1A28] font-bold text-[16px] sm:text-[17px] md:text-[18px] lg:text-[19px] mb-2 font-[Cairo] text-right">
                        {project.title}
                    </h3>

                    {/* Metadata with icons */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-gray-600 text-[11px] sm:text-[12px] md:text-[13px] font-[Cairo]">
                        {(project.date || project.start_date) && (
                            <div className="flex items-center gap-1.5">
                                <CalendarDays className="w-4 h-4 text-gray-500" />
                                <span>{project.date || project.start_date}</span>
                            </div>
                        )}
                        {project.supervisor && (
                            <div className="flex items-center gap-1.5">
                                <User className="w-4 h-4 text-gray-500" />
                                <span>{project.supervisor}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons - Left side */}
                <div className="flex gap-2 flex-shrink-0">
                    <button
                        onClick={onApprove}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-[12px] md:text-[13px] font-medium transition flex items-center gap-1.5 font-[Cairo]"
                        aria-label="اعتماد المشروع"
                    >
                        اعتماد
                    </button>
                    <button
                        onClick={onReject}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-[12px] md:text-[13px] font-medium transition flex items-center gap-1.5 font-[Cairo]"
                        aria-label="رفض المشروع"
                    >
                        رفض
                    </button>
                </div>
            </div>

            {/* Description Section */}
            <p className="text-gray-700 text-[12px] sm:text-[13px] md:text-[14px] mb-4 leading-relaxed font-[Cairo] text-right">
                {project.description || project.desc}
            </p>

            {/* Footer Section: Budget on right, Tags in middle, Details button on left */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                {/* Budget - Right side */}
                {(project.budget || project.donation_amount) && (
                    <div className="text-[#6F1A28] font-semibold text-[13px] sm:text-[14px] md:text-[15px] font-[Cairo]">
                        {project.budget || `${project.donation_amount} ريال`}
                    </div>
                )}

                {/* Tags - Middle */}
                <div className="flex flex-wrap gap-2 flex-1 justify-center">
                    {project.tags && project.tags.map((tag: string, idx: number) => {
                        const isMedium = tag === "متوسطة";
                        const isLarge = tag === "كبيرة";
                        return (
                            <span
                                key={idx}
                                className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] md:text-[12px] font-[Cairo] flex items-center gap-1 ${isMedium
                                    ? 'bg-[#FFDAB9] text-orange-700'
                                    : isLarge
                                        ? 'bg-[#E0F2F7] text-blue-700'
                                        : 'bg-gray-200 text-gray-700'
                                    }`}
                            >
                                {(isMedium || isLarge) && (
                                    <AlertTriangle className="w-3 h-3" />
                                )}
                                {tag}
                            </span>
                        );
                    })}
                </div>

                {/* Details Button - Left side */}
                <button
                    onClick={onDetailsClick}
                    className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-[#6F1A28] text-[11px] sm:text-[12px] md:text-[13px] transition font-[Cairo] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
                    aria-label={`عرض تفاصيل ${project.title}`}
                >
                    عرض التفاصيل
                </button>
            </div>
        </div>
    );
}

export default function AdminMain() {
    const { access } = useAuth();
    const { settings: dashboardSettings, updateSetting } = useDashboardSettings();
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("افكار المشاريع");
    const tabs = ["افكار المشاريع", "المشاريع المنتهية", "المشاريع النشطة"];
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [rejectConfirmProject, setRejectConfirmProject] = useState<any | null>(null);
    const [removedProjects, setRemovedProjects] = useState<Set<number>>(new Set());
    const [visibleProjectsCount, setVisibleProjectsCount] = useState<{ [key: string]: number }>({
        "افكار المشاريع": 2,
        "المشاريع النشطة": 2,
        "المشاريع المنتهية": 2
    });
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [statsFormData, setStatsFormData] = useState({
        total_volunteers: 0,
        new_volunteers: 0,
        returning_volunteers: 0,
        total_hours: 0,
        total_contribution_value: 0,
        contribution_value_display: '',
    });
    const [isSavingStats, setIsSavingStats] = useState(false);
    const [isEditingDashboardSettings, setIsEditingDashboardSettings] = useState(false);
    const [draftDashboardSettings, setDraftDashboardSettings] = useState<DraftDashboardSettings>({
        showDashboard: dashboardSettings.showDashboard,
        showKPIs: dashboardSettings.showKPIs,
        showDonut: dashboardSettings.showDonut,
        showVolunteerBars: dashboardSettings.showVolunteerBars,
        showTopVolunteers: dashboardSettings.showTopVolunteers,
    });
    const excelInputRef = useRef<HTMLInputElement | null>(null);

    const dashboardSettingItems: Array<{ key: EditableDashboardKey; label: string }> = [
        { key: 'showDashboard', label: 'إحصائية المتطوعين' },
        { key: 'showKPIs', label: 'عدد الساعات التطوعية / قيمة إسهام المتطوع' },
        { key: 'showDonut', label: 'إحصائية المتطوعين / مجموع الساعات التطوعية للإدارات' },
        { key: 'showVolunteerBars', label: 'عدد المتطوعين' },
        { key: 'showTopVolunteers', label: 'أفضل المتطوعين' },
    ];

    // API States
    const [stats, setStats] = useState({
        total_donations: "0",
        total_beneficiaries: "0",
        active_projects: "0",
        completed_projects: "0",
        total_projects: "0"
    });
    const [projectIdeas, setProjectIdeas] = useState<Project[]>([]);
    const [activeProjects, setActiveProjects] = useState<Project[]>([]);
    const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
    const [participationRequests, setParticipationRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Bottom Project Section States
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [projectStatus, setProjectStatus] = useState("حالة المشروع");
    const [isProjectHidden, setIsProjectHidden] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editFormData, setEditFormData] = useState({
        projectName: '',
        projectType: '',
        projectDescription: '',
        targetAudience: '',
        beneficiaries: '',
        donationAmount: '',
        startDate: '',
        endDate: '',
    });

    // Filter projects based on search query
    const filterProjects = (projects: Project[]) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return projects;


        const filtered = projects.filter(project => {
            const searchText = [
                project.title || '',
                project.description || project.desc || '',
                project.category || '',
                project.target_audience || '',
                project.location || '',
                project.organization || '',
                project.supervisor || '',
                project.tags?.join(' ') || ''
            ].join(' ').toLowerCase();

            const matches = searchText.includes(query);

            if (matches) {
            }

            return matches;
        });

        return filtered;
    };

    // Fetch all data on mount
    useEffect(() => {
        fetchStats();
        fetchProjects();
        fetchParticipationRequests();
        fetchAllProjectsForSlider();
    }, []);

    useEffect(() => {
        if (!isEditingDashboardSettings) {
            setDraftDashboardSettings({
                showDashboard: dashboardSettings.showDashboard,
                showKPIs: dashboardSettings.showKPIs,
                showDonut: dashboardSettings.showDonut,
                showVolunteerBars: dashboardSettings.showVolunteerBars,
                showTopVolunteers: dashboardSettings.showTopVolunteers,
            });
        }
    }, [dashboardSettings, isEditingDashboardSettings]);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/stats/`, {
                headers: { 'Authorization': `Bearer ${access}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStats({
                    total_donations: data.total_donations?.toLocaleString() || "0",
                    total_beneficiaries: `+ ${data.total_beneficiaries || 0}`,
                    active_projects: data.active_projects?.toString() || "0",
                    completed_projects: data.completed_projects?.toString() || "0",
                    total_projects: data.total_projects?.toString() || "0"
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchProjects = async () => {
        setLoading(true);
        try {

            // Fetch pending projects (ideas)
            const pendingResponse = await fetch(`${API_BASE_URL}/api/projects/?status=pending`, {
                headers: { 'Authorization': `Bearer ${access}` }
            });
            if (pendingResponse.ok) {
                const pendingData = await pendingResponse.json();
                const ideas = Array.isArray(pendingData) ? pendingData : (pendingData.results || []);
                setProjectIdeas(ideas);
            } else {
                console.error('❌ Failed to fetch pending projects:', pendingResponse.status, await pendingResponse.text());
            }

            // Fetch active projects
            const activeResponse = await fetch(`${API_BASE_URL}/api/projects/?status=active`, {
                headers: { 'Authorization': `Bearer ${access}` }
            });
            if (activeResponse.ok) {
                const activeData = await activeResponse.json();
                const active = Array.isArray(activeData) ? activeData : (activeData.results || []);
                setActiveProjects(active);
            } else {
                console.error('❌ Failed to fetch active projects:', activeResponse.status, await activeResponse.text());
            }

            // Fetch completed projects
            const completedResponse = await fetch(`${API_BASE_URL}/api/projects/?status=completed`, {
                headers: { 'Authorization': `Bearer ${access}` }
            });
            if (completedResponse.ok) {
                const completedData = await completedResponse.json();
                const completed = Array.isArray(completedData) ? completedData : (completedData.results || []);
                setCompletedProjects(completed);
            } else {
                console.error('❌ Failed to fetch completed projects:', completedResponse.status, await completedResponse.text());
            }
        } catch (error) {
            console.error('💥 Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchParticipationRequests = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/volunteer-requests/?limit=4`, {
                headers: { 'Authorization': `Bearer ${access}` }
            });
            if (response.ok) {
                const data = await response.json();
                setParticipationRequests(data.results || []);
            }
        } catch (error) {
            console.error('Error fetching participation requests:', error);
        }
    };

    const fetchAllProjectsForSlider = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/`, {
                headers: { 'Authorization': `Bearer ${access}` }
            });
            if (response.ok) {
                const data = await response.json();
                const projects = Array.isArray(data) ? data : (data.results || []);
                setAllProjects(projects);
                if (projects.length > 0) {
                    const firstProject = projects[0];
                    setActiveProject(firstProject);
                    setCurrentProjectIndex(0);
                    setProjectStatus(firstProject.status_display || "نشط");
                    setIsProjectHidden(firstProject.is_hidden || false);
                    setEditFormData({
                        projectName: firstProject.title || '',
                        projectType: firstProject.category || 'أساسي',
                        projectDescription: firstProject.desc || firstProject.description || '',
                        targetAudience: firstProject.target_audience || '',
                        beneficiaries: firstProject.beneficiaries?.toString() || '',
                        donationAmount: firstProject.donation_amount?.toString() || '',
                        startDate: firstProject.start_date || '',
                        endDate: firstProject.end_date || '',
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching projects for slider:', error);
        }
    };

    const navigateProject = (direction: 'prev' | 'next') => {
        if (allProjects.length === 0) return;

        let newIndex = currentProjectIndex;
        if (direction === 'next') {
            newIndex = (currentProjectIndex + 1) % allProjects.length;
        } else {
            newIndex = currentProjectIndex === 0 ? allProjects.length - 1 : currentProjectIndex - 1;
        }

        const project = allProjects[newIndex];
        setCurrentProjectIndex(newIndex);
        setActiveProject(project);
        setProjectStatus(project.status_display || "نشط");
        setIsProjectHidden(project.is_hidden || false);
        setEditFormData({
            projectName: project.title || '',
            projectType: project.category || 'أساسي',
            projectDescription: project.desc || project.description || '',
            targetAudience: project.target_audience || '',
            beneficiaries: project.beneficiaries?.toString() || '',
            donationAmount: project.donation_amount?.toString() || '',
            startDate: project.start_date || '',
            endDate: project.end_date || '',
        });
    };

    const handleDeleteProject = async () => {
        if (!activeProject) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${activeProject.id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${access}` }
            });

            if (response.ok) {
                // Remove from allProjects
                const updatedProjects = allProjects.filter(p => p.id !== activeProject.id);
                setAllProjects(updatedProjects);

                // Navigate to next project or set null
                if (updatedProjects.length > 0) {
                    const newIndex = Math.min(currentProjectIndex, updatedProjects.length - 1);
                    setCurrentProjectIndex(newIndex);
                    setActiveProject(updatedProjects[newIndex]);
                } else {
                    setActiveProject(null);
                }

                setShowDeleteConfirm(false);
                // Refresh project lists
                fetchProjects();
            }
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    const fetchActiveProject = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/my-active-project/`, {
                headers: { 'Authorization': `Bearer ${access}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setActiveProject(data);
                    setProjectStatus(data.status_display || "نشط");
                    setIsProjectHidden(data.is_hidden || false);
                    setEditFormData({
                        projectName: data.title || '',
                        projectType: data.category || 'أساسي',
                        projectDescription: data.desc || data.description || '',
                        targetAudience: data.target_audience || '',
                        beneficiaries: data.beneficiaries?.toString() || '',
                        donationAmount: data.donation_amount?.toString() || '',
                        startDate: data.start_date || '',
                        endDate: data.end_date || '',
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching active project:', error);
        }
    };

    const handleApproveProject = async (projectId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects/${projectId}/approve/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();

                // Remove from current view (افكار المشاريع)
                setRemovedProjects(prev => new Set(prev).add(projectId));

                // Refresh data - project will now appear in المشاريع النشطة
                fetchStats();
                fetchProjects();
            } else {
                const errorData = await response.json();
                console.error('❌ Error approving project:', errorData);
            }
        } catch (error) {
            console.error('❌ Exception approving project:', error);
        }
    };

    const handleRejectProject = async (project: any) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects/${project.id}/reject/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setRemovedProjects(prev => new Set(prev).add(project.id));
                setRejectConfirmProject(null);
                fetchStats();
                fetchProjects();
            }
        } catch (error) {
            console.error('Error rejecting project:', error);
        }
    };

    // ⚠️ IMPORTANT: This dropdown FILTERS which project to display (does NOT edit the project)
    // It fetches a project with the selected status from the backend
    // To EDIT a project's status, use the Edit Modal (edit icon button)
    const handleStatusChange = async (newStatus: string) => {
        try {
            const statusMap: { [key: string]: string } = {
                "نشط": "ACTIVE",
                "متوقف": "PLANNED",
                "مكتمل": "COMPLETED",
                "ملغي": "CANCELLED"
            };

            const englishStatus = statusMap[newStatus] || newStatus;

            // Fetch a project with the selected status (FILTER, not EDIT)
            const response = await fetch(
                `${API_BASE_URL}/api/admin/my-active-project/?status=${englishStatus}`,
                {
                    headers: {
                        'Authorization': `Bearer ${access}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();

                if (data) {
                    // Display the fetched project in bottom section
                    setActiveProject(data);
                    setProjectStatus(data.status_display || newStatus);
                    setIsProjectHidden(data.is_hidden || false);
                    setEditFormData({
                        projectName: data.title || '',
                        projectType: data.category || 'أساسي',
                        projectDescription: data.desc || data.description || '',
                        targetAudience: data.target_audience || '',
                        beneficiaries: data.beneficiaries?.toString() || '',
                        donationAmount: data.donation_amount?.toString() || '',
                        startDate: data.start_date || '',
                        endDate: data.end_date || '',
                    });
                } else {
                    // No project found with this status
                    setActiveProject(null);
                    setProjectStatus(newStatus);
                }
            } else {
                console.error('❌ Error fetching project by status:', response.status);
            }
        } catch (error) {
            console.error('❌ Error filtering project by status:', error);
        }
    };
    
    const handleToggleProjectVisibility = async () => {
        if (!activeProject) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/projects/${activeProject.id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${access}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    is_hidden: !isProjectHidden
                })
            });

            if (response.ok) {
                const updatedProject = await response.json();
                // Update state with the response (keep same project visible)
                setIsProjectHidden(updatedProject.is_hidden);
                setActiveProject(updatedProject);
            } else {
                const error = await response.json();
                console.error('Error toggling visibility:', error);
            }
        } catch (error) {
            console.error('Error toggling project visibility:', error);
        }
    };
    // ✅ EDIT MODAL: This function properly EDITS the project (including status changes)
    const handleSaveEdit = async () => {
        if (!activeProject) return;

        try {
            // Map Arabic status to English for backend
            const statusMap: { [key: string]: string } = {
                "نشط": "ACTIVE",
                "متوقف": "PLANNED",
                "مكتمل": "COMPLETED",
                "ملغي": "CANCELLED"
            };

            // Build payload - only include status if it's been set to a valid value
            const payload: any = {
                title: editFormData.projectName,
                category: editFormData.projectType,
                desc: editFormData.projectDescription,
                target_audience: editFormData.targetAudience,
                beneficiaries: parseInt(editFormData.beneficiaries) || 0,
                donation_amount: parseFloat(editFormData.donationAmount) || 0,
            };

            // Only include dates if they have valid values
            if (editFormData.startDate) {
                payload.start_date = editFormData.startDate;
            }
            if (editFormData.endDate) {
                payload.end_date = editFormData.endDate;
            }

            // Only include status if it's a valid status (not default)
            if (projectStatus && projectStatus !== "حالة المشروع") {
                const statusToSend = statusMap[projectStatus] || projectStatus;
                payload.status = statusToSend;
            } else {
            }


            const response = await fetch(`${API_BASE_URL}/api/admin/projects/${activeProject.id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${access}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
    
            if (response.ok) {
                const updatedProject = await response.json();
                alert('تم حفظ التعديلات بنجاح!');
                setShowEditModal(false);

                // Update the displayed project with the edited data (keep same project visible)
                setActiveProject(updatedProject);
                setProjectStatus(updatedProject.status_display || projectStatus);
                setIsProjectHidden(updatedProject.is_hidden || false);

                // Refresh stats and project lists in top section
                fetchStats();
                fetchProjects();
            } else {
                const errorData = await response.json();
                console.error('❌ Error saving project:', errorData);
                console.error('❌ Response status:', response.status);
                console.error('❌ Full error details:', JSON.stringify(errorData, null, 2));
                alert(`حدث خطأ أثناء حفظ التعديلات:\n${JSON.stringify(errorData, null, 2)}`);
            }
        } catch (error) {
            console.error('❌ Exception saving project edit:', error);
            alert('حدث خطأ أثناء حفظ التعديلات');
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsUploading(true);
            setUploadedFile(file);
            const tempMsg = document.createElement('div');
            tempMsg.textContent = 'تم رفع الملف بنجاح';
            tempMsg.className = 'fixed top-4 right-4 bg-brand-700 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-[Cairo]';
            document.body.appendChild(tempMsg);
            setTimeout(() => {
                tempMsg.remove();
                setIsUploading(false);
            }, 1200);
        }
    };

    const fetchVolunteerStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/volunteer-statistics/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStatsFormData({
                    total_volunteers: data.total_volunteers || 0,
                    new_volunteers: data.new_volunteers || 0,
                    returning_volunteers: data.returning_volunteers || 0,
                    total_hours: data.total_hours || 0,
                    total_contribution_value: data.total_contribution_value || 0,
                    contribution_value_display: data.contribution_value_display || '',
                });
            }
        } catch (err) {
            console.error('Error fetching volunteer stats:', err);
        }
    };

    const handleOpenStatsModal = () => {
        fetchVolunteerStats();
        setShowStatsModal(true);
    };

    const handleSaveStats = async () => {
        setIsSavingStats(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/volunteer-statistics/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    year: 2025,
                    ...statsFormData
                })
            });
            if (res.ok) {
                setShowStatsModal(false);
                const tempMsg = document.createElement('div');
                tempMsg.textContent = 'تم تحديث الإحصائيات بنجاح';
                tempMsg.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-[Cairo]';
                document.body.appendChild(tempMsg);
                setTimeout(() => tempMsg.remove(), 2000);
            }
        } catch (err) {
            console.error('Error saving stats:', err);
        } finally {
            setIsSavingStats(false);
        }
    };

    const handleSaveDashboardSettings = () => {
        dashboardSettingItems.forEach(({ key }) => {
            if (dashboardSettings[key] !== draftDashboardSettings[key]) {
                updateSetting(key, draftDashboardSettings[key]);
            }
        });
        setIsEditingDashboardSettings(false);
    };

    const handleCancelDashboardSettings = () => {
        setDraftDashboardSettings({
            showDashboard: dashboardSettings.showDashboard,
            showKPIs: dashboardSettings.showKPIs,
            showDonut: dashboardSettings.showDonut,
            showVolunteerBars: dashboardSettings.showVolunteerBars,
            showTopVolunteers: dashboardSettings.showTopVolunteers,
        });
        setIsEditingDashboardSettings(false);
    };

    const statsData = [
        {
            value: stats.total_donations,
            label: "اجمالي التبرعات",
            icon: <HandCoins className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 text-yellow-400" />
        },
        {
            value: stats.total_beneficiaries,
            label: "اجمالي المستفيدين",
            icon: <img src="https://c.animaapp.com/u4OaXzk0/img/multiple-neutral-2-streamline-ultimate-regular@2x.png" alt="المستفيدين" className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12" />
        },
        {
            value: stats.active_projects,
            label: "المشاريع النشطة",
            icon: <FolderOpen className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 text-yellow-400" />
        },
        {
            value: stats.completed_projects,
            label: "المشاريع المكتملة",
            icon: <img src="https://c.animaapp.com/u4OaXzk0/img/time-clock-file-setting-streamline-ultimate-regular@2x.png" alt="المشاريع المكتملة" className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12" />
        },
        {
            value: stats.total_projects,
            label: "اجمالي المشاريع",
            icon: <FileText className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 text-yellow-400" />
        },
    ];

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center h-screen">
                    <p className="text-gray-500 font-[Cairo]">جاري التحميل...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="h-full overflow-x-hidden">
                {/* Search Bar */}
                <div className="flex justify-start mb-5 sm:mb-6">
                    <div className="relative w-full max-w-xs sm:max-w-sm h-[38px] sm:h-[40px] md:h-[42px]">
                        <div className="absolute inset-0 bg-[#faf6f76b] rounded-[20px] shadow-[inset_0px_0px_8px_#f3e3e3e0,0px_4px_15px_#8d2e4682]" />
                        <input
                            type="text"
                            placeholder="البحث..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="absolute inset-0 w-full h-full bg-transparent border-none outline-none pr-9 sm:pr-10 pl-3 text-[13px] sm:text-[14px] md:text-[15px] text-[#4e4a4b] [direction:rtl] font-[Cairo]"
                            aria-label="البحث في المشاريع"
                        />
                        <div className="absolute top-1/2 -translate-y-1/2 right-[8px] sm:right-[10px]">
                            <FiSearch className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] md:w-[16px] md:h-[16px] text-[#4e4a4b]" />
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                <div className="bg-[#F3E3E3] rounded-[16px] sm:rounded-[18px] md:rounded-[20px] shadow-xl mb-4 sm:mb-5 md:mb-6 p-4 sm:p-5 md:p-6 border border-[#f0d8c2]">
                    <div className="text-center mb-3 sm:mb-4">
                        <span className="text-[#6F1A28] font-bold text-[19px] sm:text-[20px] md:text-[22px] lg:text-[24px] font-[Cairo]">
                            احصائيات مدير المشروع
                        </span>
                    </div>

                    <div className="flex justify-center mb-4">
                        <div className="w-full max-w-[700px] h-[2px] bg-[#B98A91] rounded-full shadow-[0_3px_8px_rgba(185,138,145,0.35)]"></div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                        {statsData.map((stat, index) => (
                            <div
                                key={stat.label}
                                className="flex flex-col items-center justify-center gap-2 sm:gap-2.5 md:gap-3 px-2 sm:px-3 py-2 relative"
                            >
                                <div className="flex-shrink-0">
                                    {stat.icon}
                                </div>

                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-[#6F1A28] font-black text-[20px] sm:text-[22px] md:text-[26px] lg:text-[28px]">
                                        {stat.value}
                                    </p>
                                    <p className="text-[#6F1A28] text-[10px] sm:text-[11px] md:text-[12px] text-center leading-tight font-[Cairo]">
                                        {stat.label}
                                    </p>
                                </div>

                                {index !== statsData.length - 1 && (
                                    <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 h-16 md:h-18 lg:h-20 w-px bg-[#d7b7ae]" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dashboard Management Card */}
                <div className="flex justify-center mb-4 sm:mb-5 md:mb-6 px-4">
                    <div className="w-full max-w-5xl rounded-2xl bg-[#F3E3E3] p-4 sm:p-5 md:p-6 shadow-xl border border-[#f0d8c2]" dir="rtl">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="text-right">
                                <h3 className="text-xl font-bold text-[#6F1A28] font-[Cairo]">إدارة لوحة الإحصائيات</h3>
                                <p className="mt-1 text-sm text-[#6F1A28]/85 font-[Cairo]">التحكم في العناصر المعروضة على الصفحة الرئيسية</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={isEditingDashboardSettings ? handleSaveDashboardSettings : () => setIsEditingDashboardSettings(true)}
                                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                                    aria-label={isEditingDashboardSettings ? "حفظ إعدادات اللوحة" : "تعديل إعدادات اللوحة"}
                                >
                                    {isEditingDashboardSettings ? (
                                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" />
                                    ) : (
                                        <SquarePen className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                    )}
                                </button>
                                {isEditingDashboardSettings && (
                                    <button
                                        type="button"
                                        onClick={handleCancelDashboardSettings}
                                        className="px-3 py-1.5 rounded-lg text-sm font-[Cairo] text-[#86676A] border border-[#86676A]/50 hover:bg-white/50 transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                )}
                            </div>
                        </div>

                        <section className="rounded-xl bg-white/70 border border-[#e7d3ce] p-4">
                            <h4 className="text-base font-bold text-[#6F1A28] font-[Cairo] mb-4">العناصر المعروضة</h4>
                            <div className="mb-4 rounded-lg border border-[#efdeda] bg-white px-3 py-2.5">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[#291613] text-sm font-[Cairo]">السنة الحالية</span>
                                    <span className="text-[#291613] font-semibold font-[Cairo]">{new Date().getFullYear()}</span>
                                </div>
                                <p className="mt-2 text-xs text-[#6F1A28]/80 font-[Cairo] text-right">
                                    ملاحظة: السنة تتحدث تلقائيًا حسب السنة الحالية.
                                </p>
                            </div>
                            <ul className="space-y-2">
                                {dashboardSettingItems.map((item) => (
                                    <li key={item.key} className="rounded-lg border border-[#efdeda] bg-white px-3 py-2.5">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-[#291613] text-sm font-[Cairo] text-right">{item.label}</span>
                                            {isEditingDashboardSettings ? (
                                                <input
                                                    type="checkbox"
                                                    checked={draftDashboardSettings[item.key]}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setDraftDashboardSettings((prev) => ({ ...prev, [item.key]: checked }));
                                                    }}
                                                    className="h-4 w-4 rounded border-gray-300 text-[#6F1A28] focus:ring-[#6F1A28]"
                                                    aria-label={`تعديل ${item.label}`}
                                                />
                                            ) : (
                                                <span
                                                    className={`inline-flex items-center justify-center rounded-md p-1 ${dashboardSettings[item.key] ? 'bg-green-50' : 'bg-red-50'}`}
                                                    aria-label={dashboardSettings[item.key] ? `${item.label} مفعلة` : `${item.label} مخفية`}
                                                >
                                                    {dashboardSettings[item.key] ? (
                                                        <Check size={18} className="text-green-700" />
                                                    ) : (
                                                        <X size={18} className="text-red-700" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <div className="mt-4 border-t border-[#e6d7d4] pt-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <h4 className="text-base font-bold text-[#6F1A28] font-[Cairo]">إحصائيات الصفحة الرئيسية</h4>
                                <button
                                    type="button"
                                    onClick={handleOpenStatsModal}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold font-[Cairo] text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ab686f] focus-visible:ring-offset-2 bg-[#ab686f] hover:bg-[#95545b] shadow-sm hover:shadow-md"
                                >
                                    <SquarePen className="w-4 h-4" />
                                    <span>تعديل الإحصائيات</span>
                                </button>
                            </div>
                            <p className="text-xs text-[#6F1A28]/80 font-[Cairo] text-right">
                                عدّل أرقام إحصائيات المتطوعين المعروضة في الصفحة الرئيسية.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Columns */}
                <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 md:gap-6 mb-4 sm:mb-5 md:mb-6">
                    {/* Projects Tabs Column */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-[#ab686f] rounded-t-[16px] sm:rounded-t-[18px] md:rounded-t-[20px] flex overflow-x-auto shadow-lg">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={` flex-1 py-2 sm:py-2.5 md:py-3 px-2 sm:px-3 md:px-4 lg:px-6 text-[13px] sm:text-[14px] md:text-[15px] lg:text-[16px] font-bold font-[Cairo] transition-all duration-200 whitespace-nowrap relative
                                        ${activeTab === tab
                                            ? "bg-[#F3E3E3] text-[#291613] rounded-t-[16px] sm:rounded-t-[18px] md:rounded-t-[20px] shadow-sm"
                                            : "text-white/50"}
                                            `} aria-label={`عرض ${tab}`} role="tab" aria-selected={activeTab === tab}>
                                    {tab}
                                    {activeTab === tab && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[2px] bg-[#d9bdc1] rounded-t-full"></span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="bg-[#F3E3E3] rounded-b-[16px] sm:rounded-b-[18px] md:rounded-b-[20px] p-3 sm:p-4 md:p-5 lg:p-6 space-y-3 sm:space-y-4" role="tabpanel" style={{ minHeight: '600px' }}>
                            {/* Debug Info - Total Projects */}
                            {!searchQuery.trim() && (
                                <div className="bg-[#fff8e3] border border-[#DFC775] rounded-lg p-2 mb-2 text-xs text-[#6F1A28] font-[Cairo] font-medium">
                                    إجمالي المشاريع: <span className="font-bold text-[#8d2e46]">{activeTab === "افكار المشاريع" ? projectIdeas.length : activeTab === "المشاريع النشطة" ? activeProjects.length : completedProjects.length}</span>
                                </div>
                            )}

                            {/* Search Results Info */}
                            {searchQuery.trim() && (
                                <div className="bg-white rounded-lg p-3 mb-4 flex items-center justify-between border border-[#DFC775]">
                                    <div className="flex items-center gap-2">
                                        <FiSearch className="text-[#8d2e46]" />
                                        <span className="text-sm text-gray-700 font-[Cairo]">
                                            نتائج البحث عن: "<span className="font-bold text-[#8d2e46]">{searchQuery}</span>"
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="text-xs text-gray-600 hover:text-[#8d2e46] font-[Cairo] flex items-center gap-1"
                                    >
                                        <X size={14} />
                                        مسح البحث
                                    </button>
                                </div>
                            )}

                            {activeTab === "افكار المشاريع" && (
                                <>
                                    {filterProjects(projectIdeas).filter(project => !removedProjects.has(project.id)).length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-xl">
                                            <FiSearch className="mx-auto text-gray-400 mb-3" size={48} />
                                            <p className="text-gray-600 text-lg font-[Cairo]">
                                                {searchQuery.trim() ? 'لا توجد نتائج للبحث' : 'لا توجد أفكار مشاريع حالياً'}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {filterProjects(projectIdeas)
                                                .filter(project => !removedProjects.has(project.id))
                                                .slice(0, visibleProjectsCount["افكار المشاريع"])
                                                .map((project) => (
                                                    <ProjectCard
                                                        key={project.id}
                                                        project={project}
                                                        onDetailsClick={() => setSelectedProject(project)}
                                                        onApprove={() => handleApproveProject(project.id)}
                                                        onReject={() => setRejectConfirmProject(project)}
                                                    />
                                                ))}
                                            {filterProjects(projectIdeas).filter(project => !removedProjects.has(project.id)).length > visibleProjectsCount["افكار المشاريع"] && (
                                                <div className="flex justify-center -mb-6 sm:-mb-3">
                                                    <button
                                                        onClick={() => setVisibleProjectsCount(prev => ({ ...prev, "افكار المشاريع": prev["افكار المشاريع"] + 2 }))}
                                                        className="py-2 text-sm text-gray-700 font-[Cairo] mt-2">
                                                        عرض المزيد ({filterProjects(projectIdeas).filter(project => !removedProjects.has(project.id)).length - visibleProjectsCount["افكار المشاريع"]} متبقية)
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {activeTab === "المشاريع النشطة" && (
                                <>
                                    {filterProjects(activeProjects).filter(project => !removedProjects.has(project.id)).length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-xl">
                                            <FiSearch className="mx-auto text-gray-400 mb-3" size={48} />
                                            <p className="text-gray-600 text-lg font-[Cairo]">
                                                {searchQuery.trim() ? 'لا توجد نتائج للبحث' : 'لا توجد مشاريع نشطة حالياً'}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {filterProjects(activeProjects)
                                                .filter(project => !removedProjects.has(project.id))
                                                .slice(0, visibleProjectsCount["المشاريع النشطة"])
                                                .map((project) => (
                                                    <ProjectCard key={project.id} project={project} showProgress={true} onDetailsClick={() => setSelectedProject(project)} />
                                                ))}
                                            {filterProjects(activeProjects).filter(project => !removedProjects.has(project.id)).length > visibleProjectsCount["المشاريع النشطة"] && (
                                                <div className="flex justify-center -mb-6 sm:-mb-3">
                                                    <button
                                                        onClick={() => setVisibleProjectsCount(prev => ({ ...prev, "المشاريع النشطة": prev["المشاريع النشطة"] + 2 }))}
                                                        className="py-2 text-sm text-gray-700 font-[Cairo] mt-2">
                                                        عرض المزيد ({filterProjects(activeProjects).filter(project => !removedProjects.has(project.id)).length - visibleProjectsCount["المشاريع النشطة"]} متبقية)
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {activeTab === "المشاريع المنتهية" && (
                                <>
                                    {filterProjects(completedProjects).filter(project => !removedProjects.has(project.id)).length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-xl">
                                            <FiSearch className="mx-auto text-gray-400 mb-3" size={48} />
                                            <p className="text-gray-600 text-lg font-[Cairo]">
                                                {searchQuery.trim() ? 'لا توجد نتائج للبحث' : 'لا توجد مشاريع منتهية حالياً'}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {filterProjects(completedProjects)
                                                .filter(project => !removedProjects.has(project.id))
                                                .slice(0, visibleProjectsCount["المشاريع المنتهية"])
                                                .map((project) => (
                                                    <ProjectCard key={project.id} project={project} showProgress={true} isCompleted={true} onDetailsClick={() => setSelectedProject(project)} />
                                                ))}
                                            {filterProjects(completedProjects).filter(project => !removedProjects.has(project.id)).length > visibleProjectsCount["المشاريع المنتهية"] && (
                                                <div className="flex justify-center -mb-6 sm:-mb-3">
                                                    <button
                                                        onClick={() => setVisibleProjectsCount(prev => ({ ...prev, "المشاريع المنتهية": prev["المشاريع المنتهية"] + 2 }))}
                                                        className="py-2 text-sm text-gray-700 font-[Cairo] mt-2">
                                                        عرض المزيد ({filterProjects(completedProjects).filter(project => !removedProjects.has(project.id)).length - visibleProjectsCount["المشاريع المنتهية"]} متبقية)
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Requests Column */}
                    <div className="w-full lg:w-[300px] xl:w-[340px] lg:flex-shrink-0 lg:min-w-0">
                        <div className="bg-[#F3E3E3] rounded-[16px] sm:rounded-[18px] md:rounded-[20px] p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg border border-[#f0d8c2]">
                            <h3 className="text-[#6F1A28] font-bold text-[16px] sm:text-[17px] md:text-[18px] lg:text-[19px] mb-3 sm:mb-4 font-[Cairo]">
                                طلبات المشاركة بالمشاريع
                            </h3>

                            <div className="space-y-2 sm:space-y-2.5 md:space-y-3 mb-3 sm:mb-4">
                                {participationRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="bg-white rounded-[12px] sm:rounded-[14px] md:rounded-[16px] p-2.5 sm:p-3 md:p-4 flex items-center justify-between hover:shadow-md transition cursor-pointer"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => navigate('/Admin/requests')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                navigate('/Admin/requests');
                                            }
                                        }}
                                        aria-label={`عرض تفاصيل طلب ${request.name}`}
                                    >
                                        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
                                            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-[#ab686f] rounded-full flex items-center justify-center text-white font-semibold text-[12px] sm:text-[13px] md:text-[14px]">
                                                {request.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[#6F1A28] font-semibold text-[11px] sm:text-[12px] md:text-[13px] font-[Cairo]">
                                                    {request.name}
                                                </p>
                                                <p className="text-gray-600 text-[9px] sm:text-[10px] md:text-[11px] font-[Cairo]">
                                                    {request.role}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[#6F1A28]" />
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => navigate('/Admin/requests')}
                                className="w-full py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-[12px] md:text-[13px] font-medium transition hover:opacity-80 bg-[#ab686f] text-white font-[Cairo] focus:outline-none focus:ring-2 focus:ring-[#ab686f] focus:ring-offset-2"
                                aria-label="مشاهدة جميع التفاصيل"
                            >
                                مشاهدة التفاصيل
                            </button>
                        </div>
                    </div>
                </div>


                {/* Bottom Project Section */}
                {activeProject ? (
                    <div className="bg-[#F3E3E3] rounded-[16px] sm:rounded-[18px] md:rounded-[20px] p-4 sm:p-6 md:p-8 lg:p-10 shadow-xl border border-[#f0d8c2] w-full relative" dir="rtl">
                        {/* Navigation Arrows */}
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                            <button
                                onClick={() => navigateProject('next')}
                                className="p-3 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
                                aria-label="المشروع التالي"
                            >
                                <ChevronLeft className="w-6 h-6 text-[#6F1A28]" />
                            </button>
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                            <button
                                onClick={() => navigateProject('prev')}
                                className="p-3 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
                                aria-label="المشروع السابق"
                            >
                                <ChevronLeft className="w-6 h-6 text-[#6F1A28] rotate-180" />
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row-reverse md:items-start justify-between gap-4 mb-4 sm:mb-8">

                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                {/* Edit Button */}
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                                    aria-label="تعديل المشروع"
                                >
                                    <SquarePen className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                </button>

                                {/* Visibility Toggle */}
                                <div className="relative group">
                                    <button
                                        onClick={handleToggleProjectVisibility}
                                        className="p-2 hover:bg-white/50 rounded-lg transition-colors relative"
                                        aria-label={isProjectHidden ? "إظهار المشروع" : "إخفاء المشروع"}
                                    >
                                        {isProjectHidden ? (
                                            <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                        ) : (
                                            <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                        )}
                                    </button>

                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-white text-gray-700 text-xs rounded-lg shadow-lg border border-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        {isProjectHidden ? "إظهار المشروع" : "إخفاء المشروع"}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                                    </div>
                                </div>

                                {/* Delete Button */}
                                <div className="relative group">
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                        aria-label="حذف المشروع"
                                    >
                                        <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                                    </button>

                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-white text-gray-700 text-xs rounded-lg shadow-lg border border-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        حذف المشروع
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 text-center">
                                {/* Project Counter */}
                                <div className="text-sm text-gray-500 font-[Cairo] mb-2">
                                    {currentProjectIndex + 1} / {allProjects.length}
                                </div>
                                <h2 className="text-[#6F1A28] font-bold text-[19px] sm:text-[20px] md:text-[22px] lg:text-[24px] font-[Cairo] mb-6">
                                    {activeProject.title}
                                </h2>

                                <div className="w-full max-w-[600px] mx-auto h-[2px] bg-[#B98A91] mb-6" />

                                <p className="text-gray-700 text-[13px] sm:text-[14px] md:text-[15px] leading-relaxed font-[Cairo] max-w-4xl mx-auto">
                                    {activeProject.description || activeProject.desc}
                                </p>
                            </div>

                            <div className="flex justify-start md:justify-start flex-shrink-0 self-start">
                                <ProjectStatusDropdown
                                    currentStatus={projectStatus}
                                    onStatusChange={handleStatusChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center pt-6" dir="rtl">

                            <div className="flex flex-col items-center text-center">
                                <p className="text-gray-600 text-[19px] font-medium mb-3 font-[Cairo]">
                                    عدد المستفيدين :
                                </p>

                                <div className="flex items-center gap-3">
                                    <span className="text-[#6F1A28] font-bold text-[20px] font-[Cairo]">
                                        {activeProject.beneficiaries}
                                    </span>
                                    <Users className="w-6 h-6 text-yellow-400" />
                                </div>
                            </div>


                            <div className="hidden sm:flex justify-center">
                                <span className="w-[3px] h-24 bg-[#d9bdc1]" />
                            </div>

                            <div className="flex flex-col items-center text-center">
                                <p className="text-gray-600 text-[19px] font-medium mb-3 font-[Cairo]">
                                    التبرعات للمشروع :
                                </p>

                                <div className="flex items-center gap-3">
                                    <span className="text-[#6F1A28] font-bold text-[20px] font-[Cairo]">
                                        {(activeProject.donations || activeProject.donation_amount || 0).toLocaleString()}
                                    </span>
                                    <HandCoins className="w-6 h-6 text-yellow-400" />
                                </div>
                            </div>

                            <div className="hidden sm:flex justify-center">
                                <span className="w-[3px] h-24 bg-[#d9bdc1]" />
                            </div>

                            <div className="flex flex-col items-center text-center">
                                <p className="text-gray-600 text-[19px] font-medium mb-3 font-[Cairo]">
                                    نسبة اكتمال المشروع :
                                </p>

                                <span className="text-[#6F1A28] font-bold text-[20px] font-[Cairo] mb-2">
                                    %{activeProject.progress}
                                </span>

                                <div className="w-full max-w-[200px] bg-gray-300 rounded-full h-3 overflow-hidden">
                                    <div className="bg-yellow-400 h-3 rounded-full" style={{ width: `${activeProject.progress}%`, marginLeft: 'auto', }} />
                                </div>
                            </div>
                        </div>


                        {/* Edit Project Modal */}
                        {showEditModal && (
                            <div
                                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                                onClick={() => setShowEditModal(false)}
                            >
                                <div
                                    className="bg-[#fdf8f9] rounded-[20px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-hide"
                                    onClick={(e) => e.stopPropagation()}
                                    dir="rtl"
                                >
                                    {/* Modal Header */}
                                    <div className="sticky top-0 bg-[#f3e3e3] rounded-t-[20px] px-6 py-4 border-b-2 border-[#e0cfd4] flex items-center justify-between">
                                        <h2 className="text-[20px] sm:text-[22px] md:text-[24px] font-bold text-[#2e2b2c] font-[Cairo]">
                                            تعديل بيانات المشروع
                                        </h2>
                                        <button
                                            onClick={() => setShowEditModal(false)}
                                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#8d2e46] hover:bg-[#6b1e2a] text-white flex items-center justify-center transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Modal Body */}
                                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                                        <div className="bg-white/60 rounded-[18px] p-4 sm:p-5">
                                            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#2e2b2c] mb-3 sm:mb-4 font-[Cairo] flex items-center gap-2">
                                                <span className="w-1 h-6 bg-[#8d2e46] rounded-full"></span>
                                                المعلومات الأساسية
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                                {/* اسم المشروع */}
                                                <div>
                                                    <label className="block text-[12px] sm:text-[13px] font-semibold text-gray-800 mb-1.5 sm:mb-2 font-[Cairo]">
                                                        اسم المشروع
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editFormData.projectName}
                                                        onChange={(e) => setEditFormData({ ...editFormData, projectName: e.target.value })}
                                                        className="w-full bg-white rounded-xl border border-[#8d2e46] px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] md:text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8d2e46] font-[Cairo]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[12px] sm:text-[13px] font-semibold text-gray-800 mb-1.5 sm:mb-2 font-[Cairo]">
                                                        نوع المشروع
                                                    </label>
                                                    <select
                                                        value={editFormData.projectType}
                                                        onChange={(e) => setEditFormData({ ...editFormData, projectType: e.target.value })}
                                                        className="w-full bg-white rounded-xl border border-[#8d2e46] px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] md:text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8d2e46] font-[Cairo]"
                                                    >
                                                        <option value="أساسي">أساسي</option>
                                                        <option value="مجتمعي">مجتمعي</option>
                                                        <option value="مؤسسي">مؤسسي</option>
                                                    </select>
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-[12px] sm:text-[13px] font-semibold text-gray-800 mb-1.5 sm:mb-2 font-[Cairo]">
                                                        وصف المشروع
                                                    </label>
                                                    <textarea
                                                        value={editFormData.projectDescription}
                                                        onChange={(e) => setEditFormData({ ...editFormData, projectDescription: e.target.value })}
                                                        rows={3}
                                                        className="w-full bg-white rounded-xl border border-[#8d2e46] px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] md:text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8d2e46] resize-none font-[Cairo]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/60 rounded-[18px] p-4 sm:p-5">
                                            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#2e2b2c] mb-3 sm:mb-4 font-[Cairo] flex items-center gap-2">
                                                <span className="w-1 h-6 bg-[#8d2e46] rounded-full"></span>
                                                تفاصيل التخطيط
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <label className="block text-[12px] sm:text-[13px] font-semibold text-gray-800 mb-1.5 sm:mb-2 font-[Cairo]">
                                                        الفئة المستهدفة
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editFormData.targetAudience}
                                                        onChange={(e) => setEditFormData({ ...editFormData, targetAudience: e.target.value })}
                                                        className="w-full bg-white rounded-xl border border-[#8d2e46] px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] md:text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8d2e46] font-[Cairo]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[12px] sm:text-[13px] font-semibold text-gray-800 mb-1.5 sm:mb-2 font-[Cairo]">
                                                        عدد المستفيدين
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={editFormData.beneficiaries}
                                                        onChange={(e) => setEditFormData({ ...editFormData, beneficiaries: e.target.value })}
                                                        className="w-full bg-white rounded-xl border border-[#8d2e46] px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] md:text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8d2e46] font-[Cairo]"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[12px] sm:text-[13px] font-semibold text-gray-800 mb-1.5 sm:mb-2 font-[Cairo]">
                                                        مبلغ التبرع للمشروع
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={editFormData.donationAmount}
                                                            onChange={(e) => setEditFormData({ ...editFormData, donationAmount: e.target.value })}
                                                            className="flex-1 bg-white rounded-xl border border-[#8d2e46] px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] md:text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8d2e46] font-[Cairo]"
                                                        />
                                                        <span className="text-[12px] sm:text-[13px] text-gray-700 font-medium font-[Cairo]">ريال</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[12px] sm:text-[13px] font-semibold text-gray-800 mb-1.5 sm:mb-2 font-[Cairo]">
                                                        حالة المشروع
                                                    </label>
                                                    <select
                                                        value={projectStatus}
                                                        onChange={(e) => setProjectStatus(e.target.value)}
                                                        className="w-full bg-white rounded-xl border border-[#8d2e46] px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-[13px] md:text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8d2e46] font-[Cairo]"
                                                    >
                                                        <option value="نشط">نشط</option>
                                                        <option value="متوقف">متوقف</option>
                                                        <option value="مكتمل">مكتمل</option>
                                                        <option value="ملغي">ملغي</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="sticky bottom-0 bg-[#f3e3e3] rounded-b-[20px] px-6 py-4 border-t-2 border-[#e0cfd4] flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <button
                                            onClick={handleSaveEdit}
                                            className="w-full sm:w-auto bg-[#8d2e46] hover:bg-[#6b1e2a] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-[12px] sm:text-[13px] md:text-[14px] font-bold transition-colors font-[Cairo] flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            حفظ التعديلات
                                        </button>
                                        <button
                                            onClick={() => setShowEditModal(false)}
                                            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-[#8d2e46] border-2 border-[#8d2e46] px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-[12px] sm:text-[13px] md:text-[14px] font-bold transition-colors font-[Cairo] flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            إلغاء
                                        </button>
                                    </div>
                                </div>
                            </div>)}
                    </div>
                ) : (
                    <div className="bg-[#F3E3E3] rounded-[20px] p-10 shadow-lg border border-[#f0d8c2] text-center" dir="rtl">
                        <p className="text-gray-600 text-xl font-[Cairo]">لا يوجد مشروع نشط</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 font-[Cairo] mb-2">
                                حذف المشروع
                            </h3>
                            <p className="text-gray-600 font-[Cairo] mb-6">
                                هل أنت متأكد من حذف مشروع "{activeProject?.title}"؟
                                <br />
                                <span className="text-red-500 text-sm">هذا الإجراء لا يمكن التراجع عنه.</span>
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDeleteProject}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors font-[Cairo]"
                                >
                                    نعم، احذف
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors font-[Cairo]"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Statistics Edit Modal */}
            {showStatsModal && (
                <Modal
                    open={showStatsModal}
                    onClose={() => setShowStatsModal(false)}
                    labelledById="stats-modal-title"
                >
                    <div className="p-6" dir="rtl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 id="stats-modal-title" className="text-xl font-bold text-[#6F1A28] font-[Cairo]">
                                تعديل إحصائيات المتطوعين
                            </h2>
                            <button
                                onClick={() => setShowStatsModal(false)}
                                className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 font-[Cairo] mb-1">
                                        إجمالي المتطوعين
                                    </label>
                                    <input
                                        type="number"
                                        value={statsFormData.total_volunteers}
                                        onChange={(e) => setStatsFormData({...statsFormData, total_volunteers: parseInt(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#6F1A28] focus:outline-none font-[Cairo]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 font-[Cairo] mb-1">
                                        إجمالي الساعات
                                    </label>
                                    <input
                                        type="number"
                                        value={statsFormData.total_hours}
                                        onChange={(e) => setStatsFormData({...statsFormData, total_hours: parseInt(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#6F1A28] focus:outline-none font-[Cairo]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 font-[Cairo] mb-1">
                                        متطوعين جدد
                                    </label>
                                    <input
                                        type="number"
                                        value={statsFormData.new_volunteers}
                                        onChange={(e) => setStatsFormData({...statsFormData, new_volunteers: parseInt(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#6F1A28] focus:outline-none font-[Cairo]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 font-[Cairo] mb-1">
                                        متطوعين مكررين
                                    </label>
                                    <input
                                        type="number"
                                        value={statsFormData.returning_volunteers}
                                        onChange={(e) => setStatsFormData({...statsFormData, returning_volunteers: parseInt(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#6F1A28] focus:outline-none font-[Cairo]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 font-[Cairo] mb-1">
                                        قيمة المساهمة (ريال)
                                    </label>
                                    <input
                                        type="number"
                                        value={statsFormData.total_contribution_value}
                                        onChange={(e) => setStatsFormData({...statsFormData, total_contribution_value: parseInt(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#6F1A28] focus:outline-none font-[Cairo]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 font-[Cairo] mb-1">
                                        عرض القيمة (مثال: 1.03M)
                                    </label>
                                    <input
                                        type="text"
                                        value={statsFormData.contribution_value_display}
                                        onChange={(e) => setStatsFormData({...statsFormData, contribution_value_display: e.target.value})}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#6F1A28] focus:outline-none font-[Cairo]"
                                        placeholder="1.03M"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSaveStats}
                                disabled={isSavingStats}
                                className="flex-1 bg-[#6F1A28] text-white font-bold py-3 rounded-lg hover:bg-[#5a1520] transition-colors font-[Cairo] disabled:opacity-50"
                            >
                                {isSavingStats ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                            </button>
                            <button
                                onClick={() => setShowStatsModal(false)}
                                className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors font-[Cairo]"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Project Details Dialog */}
            {selectedProject && (
                <Modal
                    open={!!selectedProject}
                    onClose={() => setSelectedProject(null)}
                    labelledById="project-dialog-title"
                >
                    <div className="flex flex-col max-h-[80vh]" dir="rtl">
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 rounded-t-2xl px-6 py-4 flex items-start justify-between">
                            <div className="flex-1">
                                <h2 id="project-dialog-title" className="text-2xl font-bold text-[#6F1A28] font-[Cairo] mb-2">
                                    {selectedProject.title}
                                </h2>
                                {(selectedProject.date || selectedProject.start_date || selectedProject.supervisor) && (
                                    <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm font-[Cairo]">
                                        {(selectedProject.date || selectedProject.start_date) && (
                                            <div className="flex items-center gap-1.5">
                                                <CalendarDays className="w-4 h-4 text-gray-500" />
                                                <span>{selectedProject.date || selectedProject.start_date}</span>
                                            </div>
                                        )}
                                        {selectedProject.supervisor && (
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-4 h-4 text-gray-500" />
                                                <span>{selectedProject.supervisor}</span>
                                            </div>
                                        )}
                                        {selectedProject.location && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4 text-gray-500" />
                                                <span>{selectedProject.location}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedProject(null)}
                                className="rounded-xl p-2 hover:bg-white/50 transition-colors"
                                aria-label="إغلاق"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto px-6 py-6 bg-white">
                            {/* Description */}
                            {(selectedProject.description || selectedProject.desc) && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-[#6F1A28] mb-3 font-[Cairo]">الوصف</h3>
                                    <p className="text-gray-700 leading-relaxed font-[Cairo]">
                                        {selectedProject.description || selectedProject.desc}
                                    </p>
                                </div>
                            )}

                            {/* Budget */}
                            {(selectedProject.budget || selectedProject.donation_amount) && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-[#6F1A28] mb-3 font-[Cairo]">الميزانية</h3>
                                    <p className="text-[#6F1A28] font-semibold text-xl font-[Cairo]">
                                        {selectedProject.budget || `${selectedProject.donation_amount} ريال`}
                                    </p>
                                </div>
                            )}

                            {/* Progress (for active/completed projects) */}
                            {selectedProject.progress !== undefined && (
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-bold text-[#6F1A28] font-[Cairo]">التقدم</h3>
                                        <span className="text-gray-700 text-base font-[Cairo]">
                                            %{selectedProject.progress}
                                        </span>
                                    </div>
                                    <div className="bg-gray-300 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-[#8D2E46] h-full rounded-full transition-all duration-300"
                                            style={{ width: `${selectedProject.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {selectedProject.tags && selectedProject.tags.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-[#6F1A28] mb-3 font-[Cairo]">التصنيفات</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProject.tags.map((tag: string, idx: number) => {
                                            const isMedium = tag === "متوسطة";
                                            const isLarge = tag === "كبيرة";
                                            return (
                                                <span
                                                    key={idx}
                                                    className={`px-3 py-1 rounded-full text-sm font-[Cairo] flex items-center gap-1 ${isMedium
                                                        ? 'bg-[#FFDAB9] text-orange-700'
                                                        : isLarge
                                                            ? 'bg-[#E0F2F7] text-blue-700'
                                                            : 'bg-gray-200 text-gray-700'
                                                        }`}
                                                >
                                                    {(isMedium || isLarge) && (
                                                        <AlertTriangle className="w-3 h-3" />
                                                    )}
                                                    {tag}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {selectedProject.organization && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-[#6F1A28] mb-2 font-[Cairo]">الجمعية</h3>
                                    <p className="text-gray-700 font-[Cairo]">{selectedProject.organization}</p>
                                </div>
                            )}

                            {(selectedProject.hours || selectedProject.estimated_hours) && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-[#6F1A28] mb-2 font-[Cairo]">عدد الساعات</h3>
                                    <div className="flex items-center gap-2 text-gray-700 font-[Cairo]">
                                        <Clock className="w-4 h-4 text-gray-500" />
                                        <span>{selectedProject.hours || `${selectedProject.estimated_hours} ساعة`}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {rejectConfirmProject && (
                <Modal
                    open={!!rejectConfirmProject}
                    onClose={() => setRejectConfirmProject(null)}
                    labelledById="reject-confirm-title"
                >
                    <div className="p-6" dir="rtl">
                        <h3 id="reject-confirm-title" className="text-xl font-bold text-[#6F1A28] mb-4 font-[Cairo]">

                            هل أنت متأكد من رفض المشروع "{rejectConfirmProject.title}"؟ لا يمكن التراجع عن هذا الإجراء.
                        </h3>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setRejectConfirmProject(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-[Cairo]"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => handleRejectProject(rejectConfirmProject)}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-[Cairo]"
                            >
                                رفض المشروع
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AdminLayout >
    );
}
