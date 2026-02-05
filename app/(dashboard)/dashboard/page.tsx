import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get developer with projects and stats
  const { data: developerData } = await supabase
    .from("developers")
    .select("id, display_name")
    .eq("auth_user_id", user!.id)
    .single();

  if (!developerData) {
    return <div>Loading...</div>;
  }

  const developer = developerData as { id: string; display_name: string | null };

  // Get all projects with batch stats
  const { data: projectsData } = await supabase
    .from("projects")
    .select(`
      id,
      name,
      slug,
      is_active,
      created_at,
      code_batches (
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
    is_active: boolean;
    created_at: string;
    code_batches: Array<{ total_codes: number; used_codes: number }> | null;
  };

  const projects = (projectsData || []) as ProjectWithBatches[];

  // Calculate aggregate stats
  const totalProjects = projects.length;
  let totalCodes = 0;
  let usedCodes = 0;

  projects.forEach((project) => {
    project.code_batches?.forEach((batch) => {
      totalCodes += batch.total_codes;
      usedCodes += batch.used_codes;
    });
  });

  const redemptionRate = totalCodes > 0 ? Math.round((usedCodes / totalCodes) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back{developer.display_name ? `, ${developer.display_name}` : ""}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here's an overview of your promo code distribution
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Projects
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {totalProjects}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Codes
          </div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {totalCodes.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Codes Redeemed
          </div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            {usedCodes.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Redemption Rate
          </div>
          <div className="mt-2 text-3xl font-bold text-brand-600">
            {redemptionRate}%
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Projects
          </h2>
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
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {projects.map((project) => {
              const projectTotalCodes = project.code_batches?.reduce(
                (sum, b) => sum + b.total_codes,
                0
              ) || 0;
              const projectUsedCodes = project.code_batches?.reduce(
                (sum, b) => sum + b.used_codes,
                0
              ) || 0;
              const projectRate =
                projectTotalCodes > 0
                  ? Math.round((projectUsedCodes / projectTotalCodes) * 100)
                  : 0;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                      <span className="text-brand-600 font-semibold">
                        {project.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {project.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        /{project.slug}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {projectUsedCodes} / {projectTotalCodes}
                      </div>
                      <div className="text-xs text-gray-500">codes used</div>
                    </div>

                    <div className="w-24">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500">{projectRate}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-600 rounded-full"
                          style={{ width: `${projectRate}%` }}
                        />
                      </div>
                    </div>

                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
                    }`}>
                      {project.is_active ? "Active" : "Inactive"}
                    </div>

                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No projects yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first project to start distributing promo codes
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700"
            >
              Create your first project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
