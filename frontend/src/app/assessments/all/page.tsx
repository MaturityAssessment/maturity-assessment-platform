"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopNavbar } from "@/components";
import apiClient from "@/api/axios";
import { useAuth } from "@/context";
import { AssessmentResponse } from "@/api/types";

export default function AllAssessments() {
  const router = useRouter();
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to check if user has a role or higher (hierarchical roles)
  const hasRoleOrHigher = (requiredRole: string): boolean => {
    if (!user?.role) return false;

    const roleHierarchy: { [key: string]: number } = {
      USER: 1,
      CURATOR: 2,
      ADMIN: 3,
    };

    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    return userRoleLevel >= requiredRoleLevel;
  };

  useEffect(() => {
    // Redirect if user doesn't have CURATOR or ADMIN role
    if (user && !hasRoleOrHigher("CURATOR")) {
      router.push("/dashboard");
      return;
    }

    const fetchAllAssessments = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/api/v1/assessments/all");
        setAssessments(response.data);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching all assessments:", err);
        if (err.response?.status === 403) {
          const errorMessage =
            err.response?.data?.message ||
            "Access denied. Only CURATOR or ADMIN users can access this page.";
          setError(errorMessage);
          router.push("/dashboard");
        } else {
          setError(
            "Failed to load assessments. Please try again later."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAllAssessments();
    }
  }, [user, router]);

  const getMaturityLevelColor = (level: string) => {
    switch (level) {
      case "Not Implemented":
        return "bg-red-100 text-red-800";
      case "Initial":
        return "bg-orange-100 text-orange-800";
      case "Managed":
        return "bg-yellow-100 text-yellow-800";
      case "Defined":
        return "bg-blue-100 text-blue-800";
      case "Optimised":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewAssessment = (assessmentId: number) => {
    router.push(`/assessment?draftId=${assessmentId}`);
  };

  const getStatusLabel = (assessment: AssessmentResponse) => {
    if (assessment.status === "DRAFT") return "Draft";
    if (assessment.status === "PENDING_REVIEW") return "Pending Review";
    if (assessment.status === "CHANGES_REQUESTED") return "Changes Requested";
    return assessment.isCompleted ? "Completed" : "On Hold";
  };

  const getStatusColor = (assessment: AssessmentResponse) => {
    if (assessment.status === "DRAFT") return "bg-blue-100 text-blue-800";
    if (assessment.status === "PENDING_REVIEW") return "bg-yellow-100 text-yellow-800";
    if (assessment.status === "CHANGES_REQUESTED") {
      return "bg-red-100 text-red-800";
    }
    return assessment.isCompleted
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading all assessments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar
        title="All Assessments"
        subtitle="View all assessments from all users"
        backButton={{ href: "/dashboard" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {assessments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No assessments found
            </h3>
            <p className="text-gray-600">
              There are no assessments in the system yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Total Assessments: {assessments.length}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Maturity Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assessments.map((assessment) => (
                    <tr
                      key={assessment.id}
                      onClick={() => {
                        if (assessment.status === "COMPLETED" || assessment.isCompleted) {
                          handleViewAssessment(assessment.id);
                        }
                      }}
                      className={`transition-colors ${
                        assessment.status === "COMPLETED" || assessment.isCompleted
                          ? "hover:bg-gray-100 cursor-pointer"
                          : "hover:bg-gray-50 cursor-not-allowed"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assessment)}`}
                        >
                          {getStatusLabel(assessment)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(assessment.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {assessment.userEmail || "Unknown"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMaturityLevelColor(
                            assessment.overallMaturityLevel
                          )}`}
                        >
                          {assessment.status === "DRAFT" ? "N/A" : assessment.overallMaturityLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {assessment.status === "DRAFT" ? "N/A" : `${assessment.overallAverage}/5.0`}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
