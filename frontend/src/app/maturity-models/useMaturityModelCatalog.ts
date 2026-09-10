"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "@/api/axios";
import { Domain, MaturityModelSummary } from "@/api/types";
import { AlertNotificationPayload } from "@/components";
import { useAuth } from "@/context";
import { groupMaturityModels } from "./catalog";

export default function useMaturityModelCatalog() {
  const { user } = useAuth();
  const [maturityModels, setMaturityModels] = useState<MaturityModelSummary[]>(
    []
  );
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoadFailed, setListLoadFailed] = useState(false);
  const [domainsLoadFailed, setDomainsLoadFailed] = useState(false);
  const [notification, setNotification] =
    useState<AlertNotificationPayload | null>(null);

  const dismissNotification = useCallback(() => setNotification(null), []);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);

    const [modelsResult, domainsResult] = await Promise.allSettled([
      apiClient.get<MaturityModelSummary[]>("/api/v1/maturity-model"),
      apiClient.get<Domain[]>("/api/v1/domain"),
    ]);

    if (modelsResult.status === "fulfilled") {
      setMaturityModels(modelsResult.value.data);
      setListLoadFailed(false);
    } else {
      console.error("Error fetching maturity models:", modelsResult.reason);
      setMaturityModels([]);
      setListLoadFailed(true);
      setNotification({
        variant: "error",
        title: "Could not load models",
        message:
          "Failed to load maturity models. Please try again in a moment.",
      });
    }

    if (domainsResult.status === "fulfilled") {
      setDomains(domainsResult.value.data);
      setDomainsLoadFailed(false);
    } else {
      console.error("Error fetching domains:", domainsResult.reason);
      setDomains([]);
      setDomainsLoadFailed(true);
      setNotification((current) =>
        current ?? {
          variant: "error",
          title: "Could not load domains",
          message:
            "Models are available, but domain filtering and model creation may be unavailable.",
        }
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const canManage = user?.role === "CURATOR" || user?.role === "ADMIN";
  const modelGroups = useMemo(() => {
    const groups = groupMaturityModels(maturityModels);
    return canManage
      ? groups
      : groups.filter((group) => Boolean(group.activeVersion));
  }, [canManage, maturityModels]);

  const canCreate = canManage && !domainsLoadFailed && domains.length > 0;

  return {
    domains,
    loading,
    listLoadFailed,
    domainsLoadFailed,
    notification,
    dismissNotification,
    fetchCatalog,
    modelGroups,
    canManage,
    canCreate,
  };
}
