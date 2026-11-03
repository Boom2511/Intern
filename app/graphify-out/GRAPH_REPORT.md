# Graph Report - C:\Users\Admin\Desktop\Intern-main\app  (2026-11-01)

## Corpus Check
- 84 files · ~63,432 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 390 nodes · 526 edges · 21 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `GET()` - 58 edges
2. `POST()` - 29 edges
3. `dynamic` - 26 edges
4. `error` - 21 edges
5. `PATCH()` - 10 edges
6. `revalidate` - 8 edges
7. `handleSubmit()` - 8 edges
8. `[loading, setLoading]` - 7 edges
9. `router` - 7 edges
10. `searchParams` - 5 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `error`  [INFERRED]
  C:\Users\Admin\Desktop\Intern-main\app\api\zones\route.ts → C:\Users\Admin\Desktop\Intern-main\app\liff\tickets\[id]\page.tsx
- `POST()` --calls--> `findDbHeadViaManagers()`  [INFERRED]
  C:\Users\Admin\Desktop\Intern-main\app\api\zones\route.ts → C:\Users\Admin\Desktop\Intern-main\app\api\diagnostics\zones\route.ts
- `POST()` --calls--> `match`  [INFERRED]
  C:\Users\Admin\Desktop\Intern-main\app\api\zones\route.ts → C:\Users\Admin\Desktop\Intern-main\app\settings\zone-tree\page.tsx
- `POST()` --calls--> `getDepartmentLabel()`  [INFERRED]
  C:\Users\Admin\Desktop\Intern-main\app\api\zones\route.ts → C:\Users\Admin\Desktop\Intern-main\app\user\tickets\page.tsx
- `GET()` --calls--> `error`  [INFERRED]
  C:\Users\Admin\Desktop\Intern-main\app\api\zones\route.ts → C:\Users\Admin\Desktop\Intern-main\app\liff\tickets\[id]\page.tsx

## Communities

### Community 0 - "Community 0"
_Handles generation of time-based trends and department statistics, including permissions and API support._
Cohesion: 0.05
Nodes (24): Boolean(), calculateRemainingTime(), checkGroup(), dynamic, findDbHeadViaManagers(), generate1DayTrends(), generate30DayTrends(), generate30DayTrendsForDepartment() (+16 more)

### Community 1 - "Community 1"

Cohesion: 0.04
Nodes (46): addBranch(), [branchDialog, setBranchDialog], [branchFilter, setBranchFilter], [branchName, setBranchName], [bulkBusy, setBulkBusy], [bulkDialog, setBulkDialog], [bulkError, setBulkError], [bulkField, setBulkField] (+38 more)

### Community 2 - "Community 2"

Cohesion: 0.05
Nodes (37): [accessDenied, setAccessDenied], [activeEmployee, setActiveEmployee], { attributes, listeners, setNodeRef: setDragRef, isDragging, transform }, config, departments, deptEmployees, [editForm, setEditForm], [editingEmployee, setEditingEmployee] (+29 more)

### Community 3 - "Community 3"

Cohesion: 0.06
Nodes (35): async(), [branches, setBranches], [copiedId, setCopiedId], [data, setData], [editingUser, setEditingUser], error, [expandedCHIEFs, setExpandedCHIEFs], [expandedZones, setExpandedZones] (+27 more)

### Community 4 - "Community 4"

Cohesion: 0.07
Nodes (16): match, addRecentEvent(), administrator(), bucketName, DEBUG_MODE, expectedManagerRole, LINE_CHANNEL_SECRET, MAX_EVENTS (+8 more)

### Community 5 - "Community 5"

Cohesion: 0.08
Nodes (19): [availableSheets, setAvailableSheets], [branchLoadError, setBranchLoadError], canUpload, [currentUser, setCurrentUser], { data, error, mutate, isLoading }, [dragActive, setDragActive], handleDrag, handleDrop (+11 more)

### Community 6 - "Community 6"

Cohesion: 0.12
Nodes (22): [currentPage, setCurrentPage], endDate, [error, setError], getDepartmentLabel(), getStatusLabel(), handlePageChange(), handleRefresh(), [isOpen, setIsOpen] (+14 more)

### Community 7 - "Community 7"

Cohesion: 0.1
Nodes (17): [actionNote, setActionNote], clientToken, fileInputRef, params, { profile, error: liffError }, [selectedImages, setSelectedImages], [showHistory, setShowHistory], [showViewHistory, setShowViewHistory] (+9 more)

### Community 8 - "Community 8"

Cohesion: 0.1
Nodes (13): apiUrl, { data, error, isLoading, mutate }, department, departmentLabel, DevVConsole, handleClick, handlePrefetch, isBreached (+5 more)

### Community 9 - "Community 9"

Cohesion: 0.11
Nodes (15): [currentTime, setCurrentTime], [departmentRange, setDepartmentRange], { departments, statusBreakdown, departmentStatusChart, isLoading: departmentsLoading, isError: departmentsError, isValidating: departmentsValidating }, displayActivities, displayRecentTickets, displayStats, hasUserUpdate, interval (+7 more)

### Community 10 - "Community 10"

Cohesion: 0.4
Nodes (4): [lineQuota, setLineQuota], loadLineQuota(), onVisibility(), pathname

### Community 11 - "Community 11"

Cohesion: 0.5
Nodes (1): DEPT_LABELS

### Community 12 - "Community 12"
_Collects, stores, and exposes descriptive information about data assets for discovery, lineage, and governance purposes._
Cohesion: 0.67
Nodes (1): metadata

### Community 13 - "Community 13"
_Unable to determine domain due to missing code entities._
Cohesion: 0.67
Nodes (0): 

### Community 14 - "Community 14"

Cohesion: 0.67
Nodes (1): ZoneEmployeeImportPage

### Community 15 - "Community 15"

Cohesion: 0.67
Nodes (1): StaffPage

### Community 16 - "Community 16"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **161 isolated node(s):** `metadata`, `SLA_THRESHOLDS`, `WARNING_THRESHOLD`, `LINE_CHANNEL_ACCESS_TOKEN`, `GROUPS` (+156 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 16`** (2 nodes): `page.tsx`, `ChiefOfficerDebugPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `page-redirect.tsx`, `Page()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `page.tsx`, `NewTicketPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `layout.tsx`, `TicketLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `page.tsx`, `UserPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.