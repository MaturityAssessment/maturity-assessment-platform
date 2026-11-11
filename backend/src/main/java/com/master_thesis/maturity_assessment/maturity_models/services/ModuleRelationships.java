package com.master_thesis.maturity_assessment.maturity_models.services;

import com.master_thesis.maturity_assessment.config.IllegalOperationException;
import com.master_thesis.maturity_assessment.maturity_models.dto.DimensionDTO;
import com.master_thesis.maturity_assessment.maturity_models.dto.ModuleDTO;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/** Model-time visibility constraints. These relationships do not add completion gates. */
final class ModuleRelationships {
    private ModuleRelationships() {}

    static void validate(List<DimensionDTO> dimensions) {
        for (DimensionDTO dimension : safe(dimensions)) validateDimension(safe(dimension.getModules()));
    }

    private static void validateDimension(List<ModuleDTO> modules) {
        Map<String, ModuleDTO> byCode = new LinkedHashMap<>();
        for (ModuleDTO module : modules) byCode.put(key(module.getCode()), module);
        Map<String, Set<String>> co = references(modules, byCode, ModuleDTO::getCoRequisiteModuleCodes, "co-requisite");
        Map<String, Set<String>> mutex = references(modules, byCode, ModuleDTO::getMutexModuleCodes, "mutually exclusive");
        makeSymmetric(co);
        makeSymmetric(mutex);
        // Canonical sibling spelling/order and reciprocal edges survive every read/write/export.
        for (ModuleDTO module : modules) {
            module.setCoRequisiteModuleCodes(modules.stream().filter(other -> co.get(key(module.getCode())).contains(key(other.getCode())))
                    .map(ModuleDTO::getCode).toList());
            module.setMutexModuleCodes(modules.stream().filter(other -> mutex.get(key(module.getCode())).contains(key(other.getCode())))
                    .map(ModuleDTO::getCode).toList());
        }
        // A module must remain possible to show, even when it is currently hidden.
        for (ModuleDTO root : modules) {
            Map<String, List<String>> paths = closure(root, byCode, co);
            for (String current : paths.keySet()) for (String excluded : mutex.get(current)) {
                if (paths.containsKey(excluded)) throw new IllegalOperationException("CONFLICTING_MODULE_RELATIONSHIPS",
                        "Module '" + root.getCode() + "' requires visibility of both '" + byCode.get(current).getCode()
                                + "' and '" + byCode.get(excluded).getCode() + "', which are mutually exclusive. Visibility paths: "
                                + String.join(" → ", paths.get(current)) + "; " + String.join(" → ", paths.get(excluded)) + ".");
            }
        }
        for (ModuleDTO module : modules) {
            boolean visible = !Boolean.FALSE.equals(module.getVisible());
            for (String reference : co.get(key(module.getCode()))) {
                if (visible != !Boolean.FALSE.equals(byCode.get(reference).getVisible()))
                    throw new IllegalOperationException("INCONSISTENT_MODULE_VISIBILITY",
                            "Co-requisites '" + module.getCode() + "' and '" + byCode.get(reference).getCode() + "' must have the same visibility.");
            }
            if (visible) for (String reference : mutex.get(key(module.getCode()))) {
                if (!Boolean.FALSE.equals(byCode.get(reference).getVisible()))
                    throw new IllegalOperationException("INCONSISTENT_MODULE_VISIBILITY",
                            "Mutually exclusive modules '" + module.getCode() + "' and '" + byCode.get(reference).getCode() + "' cannot both be visible.");
            }
        }
    }

    private static Map<String, Set<String>> references(List<ModuleDTO> modules, Map<String, ModuleDTO> byCode,
                                                       Function<ModuleDTO, List<String>> field, String label) {
        Map<String, Set<String>> result = new LinkedHashMap<>();
        for (ModuleDTO module : modules) {
            Set<String> references = new LinkedHashSet<>();
            for (String code : safe(field.apply(module))) {
                String reference = code == null ? "" : key(code);
                if (!byCode.containsKey(reference) || reference.equals(key(module.getCode())) || !references.add(reference))
                    throw new IllegalOperationException("INVALID_MODULE_RELATIONSHIPS",
                            "Module '" + module.getCode() + "' must reference distinct other modules in the same dimension for " + label + " relationships ('" + code + "').");
            }
            result.put(key(module.getCode()), references);
        }
        return result;
    }

    private static void makeSymmetric(Map<String, Set<String>> edges) {
        for (String source : edges.keySet()) for (String target : List.copyOf(edges.get(source))) edges.get(target).add(source);
    }

    private static Map<String, List<String>> closure(ModuleDTO root, Map<String, ModuleDTO> modules, Map<String, Set<String>> co) {
        Map<String, List<String>> paths = new LinkedHashMap<>();
        List<String> queue = new ArrayList<>();
        queue.add(key(root.getCode()));
        paths.put(key(root.getCode()), List.of(root.getCode()));
        for (int index = 0; index < queue.size(); index++) {
            String current = queue.get(index);
            List<String> neighbors = new ArrayList<>(co.get(current));
            for (String code : safe(modules.get(current).getPrerequisiteModuleCodes())) neighbors.add(key(code));
            for (String next : neighbors) if (modules.containsKey(next) && !paths.containsKey(next)) {
                List<String> path = new ArrayList<>(paths.get(current));
                path.add(modules.get(next).getCode());
                paths.put(next, path);
                queue.add(next);
            }
        }
        return paths;
    }

    private static String key(String code) { return code.trim().toLowerCase(Locale.ROOT); }
    private static <T> List<T> safe(List<T> list) { return list == null ? List.of() : list; }
}
