import { useState, useMemo, useEffect, memo } from 'react';
import type { Project } from '../../types';
import Icon from '../ui/Icon';
import Card from '../ui/Card';
import Chip from '../ui/Chip';
import ProjectDialog from '../ui/ProjectDialog';
import { API_BASE_URL } from '../../config';


const filters = [
  { id: 'All', label: 'الكل' },
  { id: 'أساسي', label: 'المشاريع الأساسية' },
  { id: 'مجتمعي', label: 'المشاريع المجتمعية' },
  { id: 'مؤسسي', label: 'المشاريع المؤسسية' }
];

interface ProjectCardProps {
  project: Project;
  index: number;
  onOpen: (project: Project) => void;
}

const ProjectCard = memo(({ project, index, onOpen }: ProjectCardProps) => (
  <div
    key={project.id}
    className="animate-fadeIn"
    style={{ animationDelay: `${index * 0.1}s` }}
  >
    <Card className="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between mb-4">
        {/* المحتوى */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {project.title}
          </h3>
          <p className="text-gray-600 mb-4 leading-relaxed">{project.desc}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Icon name="Users" size={16} />
              <span>{project.beneficiaries.toLocaleString()} مستفيد</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="CalendarDays" size={16} />
              <span>{project.status}</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="MapPin" size={16} />
              <span>{project.location}</span>
            </div>
          </div>

          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            متاح
          </div>
        </div>

        {/* شارة التصنيف */}
        <div className="flex flex-col items-start gap-3">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
            {project.category}
          </div>
        </div>
      </div>

      {/* زر تفاصيل المشروع */}
      <div className="flex justify-end">
        <button
          onClick={() => onOpen(project)}
          className="group inline-flex items-center gap-2 border border-brand-400 text-brand-600 hover:bg-brand-50 hover:border-brand-500 hover:text-brand-700 focus-visible:ring-2 ring-brand-600 ring-offset-2 font-medium px-4 py-2 rounded-lg transition-all duration-300 ease-out cursor-pointer select-none"
          aria-haspopup="dialog"
        >
          <span className="inline-flex items-center gap-2 transition-all duration-300 group-hover:gap-3">
            تفاصيل المشروع
            <Icon
              name="ChevronLeft"
              size={16}
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
          </span>
        </button>
      </div>
    </Card>
  </div>
));

ProjectCard.displayName = 'ProjectCard';

function Projects() {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Backend data state
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use public endpoint - no authentication required
        const res = await fetch(`${API_BASE_URL}/api/public-projects/`);
        if (!res.ok) {
          throw new Error('فشل في تحميل المشاريع');
        }

        const data: Project[] = await res.json();
        setProjectsData(data);
      } catch (err) {
        console.error('Error fetching public projects:', err);
        setError('حدث خطأ أثناء تحميل المشاريع');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);
  



  const filteredProjects = useMemo(
    () =>
      selectedFilter === 'All'
        ? projectsData
        : projectsData.filter((project) => project.category === selectedFilter),
    [selectedFilter, projectsData]
  );
  

  const projectsList = useMemo(
    () =>
      filteredProjects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          index={index}
          onOpen={setActiveProject}
        />
      )),
    [filteredProjects]
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative isolate text-white bg-gradient-to-b from-brand-700 via-brand-600 to-brand-500 py-20 md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            background:
              'radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,.18), transparent 60%)'
          }}
        />
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="animate-slideUp">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
              المشاريع
            </h1>
            <p className="mt-4 mx-auto flex items-center justify-center gap-2 max-w-2xl text-base md:text-lg text-white/85">
              اكتشف مشاريعنا المتنوعة واختر المشروع الذي يناسب اهتماماتك للمشاركة في صنع الأثر
              <Icon
                name="Rocket"
                size={20}
                style={{ color: '#DFC775' }}
                aria-hidden="true"
                className="shrink-0"
              />
            </p>
          </div>
        </div>
        {/* الموجة الزخرفية تحت الهيرو */}
        <div className="absolute -bottom-px left-0 right-0 h-10" aria-hidden>
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="w-full h-full"
            style={{ transform: 'scaleY(-1)' }}
          >
            <path
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
              opacity=".25"
              fill="#f7f7f7"
            />
            <path
              d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
              opacity=".5"
              fill="#f7f7f7"
            />
            <path
              d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
              fill="#fffcfcff"
            />
          </svg>
        </div>
      </section>

      {/* الفلاتر */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {filters.map((filter) => (
              <Chip
                key={filter.id}
                selected={selectedFilter === filter.id}
                onClick={() => setSelectedFilter(filter.id)}
              >
                {filter.label}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      {/* شبكة المشاريع */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectsList}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">لا توجد مشاريع في هذه الفئة</p>
            </div>
          )}
        </div>
      </section>

      <ProjectDialog
        project={activeProject}
        open={!!activeProject}
        onClose={() => setActiveProject(null)}
      />
    </div>
  );
}

export default memo(Projects);