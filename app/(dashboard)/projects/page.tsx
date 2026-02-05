import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: developerData } = await supabase
    .from("developers")
    .select("id")
    .eq("auth_user_id", user!.id)
    .single();

  const developer = developerData as { id: string } | null;

  if (!developer) {
    return <div>Loading...</div>;
  }

  const { data: projectsData } = await supabase
    .from("projects")
    .select(`
      *,
      code_batches (
        id,
        platform,
        total_codes,
        used_codes
      )
    `)
    .eq("developer_id", developer.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  type ProjectWithBatches = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    code_batches: Array<{ id: string; platform: string; total_codes: number; used_codes: number }> | null;
  };

  const projects = (projectsData || []) as ProjectWithBatches[];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your promo code projects
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const totalCodes = project.code_batches?.reduce(
              (sum, b) => sum + b.total_codes,
              0
            ) || 0;
            const usedCodes = project.code_batches?.reduce(
              (sum, b) => sum + b.used_codes,
              0
            ) || 0;
            const rate = totalCodes > 0 ? Math.round((usedCodes / totalCodes) * 100) : 0;

            // Get unique platforms
            const platforms = [...new Set(project.code_batches?.map((b) => b.platform) || [])];

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                    <span className="text-xl text-brand-600 font-bold">
                      {project.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {project.is_active ? "Active" : "Inactive"}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {project.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">/{project.slug}</p>

                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mb-4">
                  {platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                      {platform}
                    </span>
                  ))}
                  {platforms.length === 0 && (
                    <span className="text-xs text-gray-400">No codes yet</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {usedCodes} / {totalCodes} codes used
                  </span>
                  <span className="font-medium text-brand-600">{rate}%</span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all"
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No projects yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create your first project to start uploading and distributing promo codes to your users.
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-medium rounded-md hover:bg-brand-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Project
          </Link>
        </div>
      )}
    </div>
  );
}
