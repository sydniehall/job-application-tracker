import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Container,
  EmptyState,
  Flex,
  IconButton,
  Input,
  Link,
  Menu,
  Popover,
  Portal,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  LuArrowDown,
  LuArrowUp,
  LuArrowUpDown,
  LuBriefcase,
  LuCheck,
  LuChevronDown,
  LuChevronsUpDown,
  LuCircleX,
  LuExternalLink,
  LuInbox,
  LuInfo,
  LuListFilter,
  LuLogOut,
  LuPlus,
  LuRotateCcw,
  LuSearch,
  LuSearchX,
  LuSettings,
  LuTrash2,
  LuTrophy,
  LuUser,
  LuX,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createApplication,
  deleteApplication,
  getApplicationSuggestions,
  getApplications,
  updateApplication,
} from "../api/applications";
import {
  createJobSearch,
  deleteJobSearch,
  getJobSearches,
  updateJobSearch,
} from "../api/jobSearches";
import { StatusBadge } from "../components/StatusBadge";
import { ApplicationForm } from "../components/ApplicationForm";
import { ApplicationDetails } from "../components/ApplicationDetails";
import { NoteDialog } from "../components/NoteDialog";
import { CreateJobSearchDialog } from "../components/CreateJobSearchDialog";
import { ManageJobSearchesDialog } from "../components/ManageJobSearchesDialog";
import { ApplicationStatus, ApplicationType } from "../index";
import type {
  ApplicationCreate,
  ApplicationRead,
  ApplicationSuggestions,
  ApplicationsQuery,
  JobSearchCreate,
  JobSearchRead,
  JobSearchUpdate,
  UserRead,
} from "../index";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

const EMPTY_SUGGESTIONS: ApplicationSuggestions = { companies: [], titles: [], locations: [] };

const STATUS_CYCLE: ApplicationStatus[] = [
  ApplicationStatus.Applied,
  ApplicationStatus.Screening,
  ApplicationStatus.Interview,
  ApplicationStatus.Withdrawn,
  ApplicationStatus.ToApply,
];

function nextStatus(current: ApplicationStatus): ApplicationStatus {
  const index = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length];
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatShortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${SHORT_MONTHS[Number(month) - 1]} ${Number(day)}`;
}

type SortField =
  | "created_at"
  | "title"
  | "company"
  | "status"
  | "location"
  | "type"
  | "date_applied"
  | "deadline";
type SortDir = "asc" | "desc";

// Every sortable field except the default ("created_at" has no menu entry;
// it's reached via the "Sort by creation" reset button instead).
const SORT_MENU_FIELD_LABELS: Record<Exclude<SortField, "created_at">, string> = {
  title: "Job Title",
  company: "Company",
  status: "Status",
  location: "Location",
  type: "Type",
  date_applied: "Applied Date",
  deadline: "Deadline",
};

const ALL_STATUSES = "__all__";
const ALL_TYPES = "__all_types__";
const NEW_JOB_SEARCH = "__new__";
const MANAGE_JOB_SEARCHES = "__manage__";

function toggleSelection(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

interface FilterCategoryListProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

// A checkable list within the advanced-filter popover; clicking an item
// toggles it without closing the popover, so multiple values (and multiple
// categories) can be picked in one pass.
function FilterCategoryList({ label, options, selected, onToggle }: FilterCategoryListProps) {
  return (
    <Box>
      <Text textStyle="xs" color="fg.muted" mb="1">
        {label}
      </Text>
      {options.length === 0 ? (
        <Text textStyle="xs" color="fg.subtle">
          No matches
        </Text>
      ) : (
        <Flex direction="column" maxH="120px" overflowY="auto" gap="0.5">
          {options.map((value) => (
            <Flex
              key={value}
              as="button"
              onClick={() => onToggle(value)}
              align="center"
              justify="space-between"
              gap="2"
              px="2"
              py="1"
              rounded="md"
              textAlign="left"
              bg={selected.includes(value) ? "blue.subtle" : "transparent"}
              _hover={{ bg: selected.includes(value) ? "blue.subtle" : "bg.subtle" }}
            >
              <Text textStyle="sm" truncate>
                {value}
              </Text>
              {selected.includes(value) && <LuCheck size={14} />}
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
}

interface AdvancedFilterCategoryPopoverProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

// A category button within the "Advanced" filter popover. The full option
// list stays hidden behind this trigger until clicked, so the advanced
// filter panel itself only ever shows three compact buttons.
function AdvancedFilterCategoryPopover({
  label,
  options,
  selected,
  onToggle,
}: AdvancedFilterCategoryPopoverProps) {
  const [search, setSearch] = useState("");

  return (
    <Popover.Root positioning={{ placement: "right-start" }}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          color={selected.length > 0 ? "blue.500" : "fg.muted"}
          justifyContent="space-between"
        >
          {label}
          {selected.length > 0 ? ` (${selected.length})` : ""}
          <LuChevronDown />
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content minW="220px">
            <Popover.Body>
              <Flex direction="column" gap="2">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  size="sm"
                />
                <FilterCategoryList
                  label={label}
                  options={options.filter((o) =>
                    o.toLowerCase().includes(search.trim().toLowerCase()),
                  )}
                  selected={selected}
                  onToggle={onToggle}
                />
              </Flex>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

interface SortableHeaderProps {
  label: string;
  field: SortField;
  activeField: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
  width?: string;
  minW?: string;
}

// The direction icon is always visible on the active column; on inactive
// columns it only appears on hover, as a hint that the header is clickable.
function SortableHeader({ label, field, activeField, dir, onSort, width, minW }: SortableHeaderProps) {
  const isActive = activeField === field;
  return (
    <Table.ColumnHeader
      w={width}
      minW={minW}
      color="fg.muted"
      cursor="pointer"
      userSelect="none"
      className="group"
      onClick={() => onSort(field)}
      _hover={{ color: "fg" }}
    >
      <Flex align="center" gap="1">
        {label}
        {isActive ? (
          dir === "asc" ? <LuArrowUp size={14} /> : <LuArrowDown size={14} />
        ) : (
          <Box opacity="0" _groupHover={{ opacity: 1 }}>
            <LuArrowUpDown size={14} />
          </Box>
        )}
      </Flex>
    </Table.ColumnHeader>
  );
}

// A lineClamp="2" cell renders one line tall unless its text actually
// wrapped; scrollHeight noticeably exceeding a single line's height means it did.
function computeWrappedIds(refs: Map<number, HTMLParagraphElement>): Set<number> {
  const result = new Set<number>();
  refs.forEach((el, id) => {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    if (!Number.isNaN(lineHeight) && el.scrollHeight > lineHeight * 1.5) {
      result.add(id);
    }
  });
  return result;
}

function setsAreEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

const SORT_FIELDS: SortField[] = [
  "created_at", "title", "company", "status", "location", "type", "date_applied", "deadline",
];

function isSortField(value: string): value is SortField {
  return (SORT_FIELDS as string[]).includes(value);
}

function isSortDir(value: string): value is SortDir {
  return value === "asc" || value === "desc";
}

function isApplicationStatus(value: string): value is ApplicationStatus {
  return (Object.values(ApplicationStatus) as string[]).includes(value);
}

function isApplicationType(value: string): value is ApplicationType {
  return (Object.values(ApplicationType) as string[]).includes(value);
}

interface PersistedFilters {
  sortField: SortField;
  sortDir: SortDir;
  statusFilter: ApplicationStatus | null;
  typeFilter: ApplicationType | null;
  appliedDateFrom: string;
  appliedDateTo: string;
  advancedFilterTitles: string[];
  advancedFilterCompanies: string[];
  advancedFilterLocations: string[];
  searchQuery: string;
}

function filtersStorageKey(userId: number): string {
  return `applications-filters:${userId}`;
}

// Restores the last-used filters/sort from localStorage (falling back to the
// user's saved defaults for sort) so a page reload doesn't reset the view.
// Values are validated individually since the stored JSON could be stale
// (e.g. a status renamed since it was written) or absent.
function loadPersistedFilters(user: UserRead | null): PersistedFilters {
  const defaultSortField: SortField =
    user && isSortField(user.default_sort_field) ? user.default_sort_field : "created_at";
  const defaultSortDir: SortDir =
    user && isSortDir(user.default_sort_dir) ? user.default_sort_dir : "desc";
  const fallback: PersistedFilters = {
    sortField: defaultSortField,
    sortDir: defaultSortDir,
    statusFilter: null,
    typeFilter: null,
    appliedDateFrom: "",
    appliedDateTo: "",
    advancedFilterTitles: [],
    advancedFilterCompanies: [],
    advancedFilterLocations: [],
    searchQuery: "",
  };
  if (!user) return fallback;
  try {
    const raw = localStorage.getItem(filtersStorageKey(user.id));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      sortField: isSortField(parsed.sortField) ? parsed.sortField : fallback.sortField,
      sortDir: isSortDir(parsed.sortDir) ? parsed.sortDir : fallback.sortDir,
      statusFilter:
        typeof parsed.statusFilter === "string" && isApplicationStatus(parsed.statusFilter)
          ? parsed.statusFilter
          : null,
      typeFilter:
        typeof parsed.typeFilter === "string" && isApplicationType(parsed.typeFilter)
          ? parsed.typeFilter
          : null,
      appliedDateFrom: typeof parsed.appliedDateFrom === "string" ? parsed.appliedDateFrom : "",
      appliedDateTo: typeof parsed.appliedDateTo === "string" ? parsed.appliedDateTo : "",
      advancedFilterTitles: Array.isArray(parsed.advancedFilterTitles)
        ? parsed.advancedFilterTitles
        : [],
      advancedFilterCompanies: Array.isArray(parsed.advancedFilterCompanies)
        ? parsed.advancedFilterCompanies
        : [],
      advancedFilterLocations: Array.isArray(parsed.advancedFilterLocations)
        ? parsed.advancedFilterLocations
        : [],
      searchQuery: typeof parsed.searchQuery === "string" ? parsed.searchQuery : "",
    };
  } catch {
    return fallback;
  }
}

function jobSearchStorageKey(userId: number): string {
  return `current-job-search:${userId}`;
}

function loadPersistedJobSearchId(userId: number): number | null {
  try {
    const raw = localStorage.getItem(jobSearchStorageKey(userId));
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Read once on mount to seed the filter/sort state declared below.
  const [persistedFilters] = useState<PersistedFilters>(() => loadPersistedFilters(user));

  // Job searches isolate the tracker: every application belongs to exactly
  // one, and all fetching below is scoped to whichever is currently active.
  const [jobSearches, setJobSearches] = useState<JobSearchRead[]>([]);
  const [isJobSearchesLoading, setIsJobSearchesLoading] = useState(true);
  const [currentJobSearchId, setCurrentJobSearchId] = useState<number | null>(null);
  const [isCreatingJobSearch, setIsCreatingJobSearch] = useState(false);
  const [isManagingJobSearches, setIsManagingJobSearches] = useState(false);

  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [total, setTotal] = useState(0);
  // Unfiltered count within the current job search — independent of
  // whatever search/filters are currently narrowing the table below.
  const [overallTotal, setOverallTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ApplicationSuggestions>(EMPTY_SUGGESTIONS);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [noteId, setNoteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => persistedFilters.searchQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(
    () => persistedFilters.searchQuery
  );
  const [isSearchVisible, setIsSearchVisible] = useState(() => Boolean(persistedFilters.searchQuery));
  const [sortField, setSortField] = useState<SortField>(() => persistedFilters.sortField);
  const [sortDir, setSortDir] = useState<SortDir>(() => persistedFilters.sortDir);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(
    () => persistedFilters.statusFilter
  );
  const [typeFilter, setTypeFilter] = useState<ApplicationType | null>(
    () => persistedFilters.typeFilter
  );
  const [appliedDateFrom, setAppliedDateFrom] = useState(() => persistedFilters.appliedDateFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(() => persistedFilters.appliedDateTo);
  const [advancedFilterTitles, setAdvancedFilterTitles] = useState<string[]>(
    () => persistedFilters.advancedFilterTitles
  );
  const [advancedFilterCompanies, setAdvancedFilterCompanies] = useState<string[]>(
    () => persistedFilters.advancedFilterCompanies
  );
  const [advancedFilterLocations, setAdvancedFilterLocations] = useState<string[]>(
    () => persistedFilters.advancedFilterLocations
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleTextRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());
  const companyTextRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());
  const [wrappedTitleIds, setWrappedTitleIds] = useState<Set<number>>(new Set());
  const [wrappedCompanyIds, setWrappedCompanyIds] = useState<Set<number>>(new Set());
  // Guards against an older, slower request overwriting a newer one's result.
  const requestIdRef = useRef(0);

  const isModalOpen =
    isAdding ||
    editingId !== null ||
    viewingId !== null ||
    noteId !== null ||
    isCreatingJobSearch ||
    isManagingJobSearches;

  const editingApp = applications.find((a) => a.id === editingId);
  const viewingApp = applications.find((a) => a.id === viewingId);
  const noteApp = applications.find((a) => a.id === noteId);

  const activeJobSearches = jobSearches.filter((js) => !js.archived);
  const currentJobSearch = jobSearches.find((js) => js.id === currentJobSearchId) ?? null;

  const hasAdvancedFilter =
    advancedFilterTitles.length > 0 ||
    advancedFilterCompanies.length > 0 ||
    advancedFilterLocations.length > 0;

  const activeFilterCount =
    (typeFilter !== null ? 1 : 0) +
    (statusFilter !== null ? 1 : 0) +
    (appliedDateFrom || appliedDateTo ? 1 : 0) +
    (hasAdvancedFilter ? 1 : 0);

  const isDefaultSort = sortField === "created_at" && sortDir === "desc";

  const isFiltered =
    Boolean(debouncedSearchQuery.trim()) ||
    statusFilter !== null ||
    typeFilter !== null ||
    Boolean(appliedDateFrom) ||
    Boolean(appliedDateTo) ||
    hasAdvancedFilter;

  function buildQuery(offset: number): ApplicationsQuery {
    return {
      limit: PAGE_SIZE,
      offset,
      job_search_id: currentJobSearchId ?? undefined,
      q: debouncedSearchQuery.trim() || undefined,
      status: statusFilter ?? undefined,
      type: typeFilter ?? undefined,
      date_applied_from: appliedDateFrom || undefined,
      date_applied_to: appliedDateTo || undefined,
      titles: advancedFilterTitles.length > 0 ? advancedFilterTitles : undefined,
      companies: advancedFilterCompanies.length > 0 ? advancedFilterCompanies : undefined,
      locations: advancedFilterLocations.length > 0 ? advancedFilterLocations : undefined,
      sort_field: sortField,
      sort_dir: sortDir,
    };
  }

  async function loadFirstPage() {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const page = await getApplications(buildQuery(0));
      if (requestIdRef.current !== requestId) return;
      setApplications(page.items);
      setTotal(page.total);
      setHasMore(page.has_more);
    } catch {
      if (requestIdRef.current === requestId) setError("Could not load applications.");
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const page = await getApplications(buildQuery(applications.length));
      setApplications((prev) => [...prev, ...page.items]);
      setTotal(page.total);
      setHasMore(page.has_more);
    } catch {
      setError("Could not load more applications.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  function refreshSuggestions() {
    getApplicationSuggestions(currentJobSearchId ?? undefined)
      .then(setSuggestions)
      .catch(() => {});
  }

  function refreshOverallTotal() {
    // limit=1 and no other filters: only page.total (the unfiltered count
    // within the current job search) is used.
    getApplications({
      limit: 1,
      offset: 0,
      job_search_id: currentJobSearchId ?? undefined,
      sort_field: "created_at",
      sort_dir: "desc",
    })
      .then((page) => setOverallTotal(page.total))
      .catch(() => {});
  }

  // Fetches the user's job searches once on mount and resolves which one is
  // "current" — the last one used (from localStorage), or else the most
  // recently created active one, or else none (triggers the create prompt).
  useEffect(() => {
    let cancelled = false;
    getJobSearches()
      .then((list) => {
        if (cancelled) return;
        // Guards against a malformed response (e.g. an HTML error page
        // returned instead of JSON) crashing the whole dashboard.
        const jobSearchList = Array.isArray(list) ? list : [];
        setJobSearches(jobSearchList);
        const active = jobSearchList.filter((js) => !js.archived);
        const persistedId = user ? loadPersistedJobSearchId(user.id) : null;
        const persisted = persistedId !== null ? active.find((js) => js.id === persistedId) : undefined;
        setCurrentJobSearchId(persisted ? persisted.id : active[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsJobSearchesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Runs once on mount; `user` is already resolved by the time Dashboard
    // renders (ProtectedRoute waits for auth to load first).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetches page one whenever search, a filter, sort, or the active job
  // search changes. Waits for job searches to finish resolving so it
  // doesn't fire once with no job search and again once one is picked.
  useEffect(() => {
    if (isJobSearchesLoading || currentJobSearchId === null) return;
    // The synchronous setIsLoading/setError at the top of loadFirstPage
    // (before its first await) is the standard "reset, then fetch" pattern
    // for an effect whose dependencies change over the component's
    // lifetime, not just on mount — react-hooks' newer set-state-in-effect
    // rule flags any pre-await setState reached from an effect, including
    // indirectly through a called function, so it fires here even though
    // this isn't the external-store/subscription misuse the rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFirstPage();
    // loadFirstPage reads current filter/sort state via closure each call;
    // listing it here would make every render redeclare a "new" dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isJobSearchesLoading,
    currentJobSearchId,
    debouncedSearchQuery,
    statusFilter,
    typeFilter,
    appliedDateFrom,
    appliedDateTo,
    advancedFilterTitles,
    advancedFilterCompanies,
    advancedFilterLocations,
    sortField,
    sortDir,
  ]);

  // Suggestions and the overall count are independent of filters — only the
  // active job search changes what they should reflect.
  useEffect(() => {
    if (isJobSearchesLoading || currentJobSearchId === null) return;
    refreshSuggestions();
    refreshOverallTotal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJobSearchesLoading, currentJobSearchId]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchQuery(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Persists the current filters/sort so a reload picks up where the user
  // left off, instead of resetting to the account-level defaults every time.
  useEffect(() => {
    if (!user) return;
    const toStore: PersistedFilters = {
      sortField,
      sortDir,
      statusFilter,
      typeFilter,
      appliedDateFrom,
      appliedDateTo,
      advancedFilterTitles,
      advancedFilterCompanies,
      advancedFilterLocations,
      searchQuery: debouncedSearchQuery,
    };
    try {
      localStorage.setItem(filtersStorageKey(user.id), JSON.stringify(toStore));
    } catch {
      // Best-effort — localStorage may be unavailable (private browsing, quota).
    }
  }, [
    user,
    sortField,
    sortDir,
    statusFilter,
    typeFilter,
    appliedDateFrom,
    appliedDateTo,
    advancedFilterTitles,
    advancedFilterCompanies,
    advancedFilterLocations,
    debouncedSearchQuery,
  ]);

  // Persists which job search is active so a reload stays on it.
  useEffect(() => {
    if (!user || currentJobSearchId === null) return;
    try {
      localStorage.setItem(jobSearchStorageKey(user.id), String(currentJobSearchId));
    } catch {
      // Best-effort — localStorage may be unavailable (private browsing, quota).
    }
  }, [user, currentJobSearchId]);

  // Typing anywhere outside an input/modal reveals the search bar and seeds
  // it with the pressed key, like Gmail/Notion's quick-find.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isSearchVisible || isModalOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;

      const target = e.target as HTMLElement | null;
      const isEditableTarget =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditableTarget) return;

      setIsSearchVisible(true);
      setSearchQuery(e.key);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchVisible, isModalOpen]);

  useEffect(() => {
    if (isSearchVisible) searchInputRef.current?.focus();
  }, [isSearchVisible]);

  function closeSearch() {
    setSearchQuery("");
    setIsSearchVisible(false);
  }

  function handleHeaderSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // Title/Company are fixed-width, so wrapping only changes when the data does.
  useLayoutEffect(() => {
    const nextTitleWrapped = computeWrappedIds(titleTextRefs.current);
    const nextCompanyWrapped = computeWrappedIds(companyTextRefs.current);
    setWrappedTitleIds((prev) => (setsAreEqual(prev, nextTitleWrapped) ? prev : nextTitleWrapped));
    setWrappedCompanyIds((prev) =>
      setsAreEqual(prev, nextCompanyWrapped) ? prev : nextCompanyWrapped,
    );
  }, [applications]);

  async function handleAdd(data: Omit<ApplicationCreate, "job_search_id">) {
    if (currentJobSearchId === null) return;
    await createApplication({ ...data, job_search_id: currentJobSearchId });
    setIsAdding(false);
    await loadFirstPage();
    refreshSuggestions();
    refreshOverallTotal();
  }

  async function handleEdit(id: number, data: Parameters<typeof updateApplication>[1]) {
    const updated = await updateApplication(id, data);
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setEditingId(null);
    refreshSuggestions();
  }

  async function handleSetStatus(app: ApplicationRead, status: ApplicationStatus) {
    const updated = await updateApplication(app.id, { status });
    setApplications((prev) => prev.map((a) => (a.id === app.id ? updated : a)));
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this application?")) return;
    await deleteApplication(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
    setTotal((prev) => Math.max(prev - 1, 0));
    setOverallTotal((prev) => Math.max(prev - 1, 0));
  }

  // Switching job search invalidates the advanced filter's title/company/
  // location selections — they were drawn from the previous search's
  // suggestions and won't mean the same thing (or anything) in the new one.
  function selectJobSearch(id: number) {
    if (id === currentJobSearchId) return;
    setCurrentJobSearchId(id);
    setAdvancedFilterTitles([]);
    setAdvancedFilterCompanies([]);
    setAdvancedFilterLocations([]);
  }

  async function handleCreateJobSearch(data: JobSearchCreate) {
    const created = await createJobSearch(data);
    setJobSearches((prev) => [created, ...prev]);
    setIsCreatingJobSearch(false);
    selectJobSearch(created.id);
  }

  async function handleUpdateJobSearch(id: number, data: JobSearchUpdate) {
    const updated = await updateJobSearch(id, data);
    setJobSearches((prev) => prev.map((js) => (js.id === id ? updated : js)));
  }

  async function handleToggleArchiveJobSearch(jobSearch: JobSearchRead) {
    const updated = await updateJobSearch(jobSearch.id, { archived: !jobSearch.archived });
    setJobSearches((prev) => prev.map((js) => (js.id === updated.id ? updated : js)));
    if (updated.archived && currentJobSearchId === updated.id) {
      const nextActive = jobSearches.find((js) => js.id !== updated.id && !js.archived);
      setCurrentJobSearchId(nextActive ? nextActive.id : null);
    }
  }

  async function handleDeleteJobSearch(jobSearch: JobSearchRead) {
    const warning =
      jobSearch.application_count > 0
        ? `Delete "${jobSearch.name}" and its ${jobSearch.application_count} application${
            jobSearch.application_count === 1 ? "" : "s"
          }? This can't be undone.`
        : `Delete "${jobSearch.name}"? This can't be undone.`;
    if (!window.confirm(warning)) return;
    await deleteJobSearch(jobSearch.id);
    setJobSearches((prev) => prev.filter((js) => js.id !== jobSearch.id));
    if (currentJobSearchId === jobSearch.id) {
      const nextActive = jobSearches.find((js) => js.id !== jobSearch.id && !js.archived);
      setCurrentJobSearchId(nextActive ? nextActive.id : null);
    }
  }

  return (
    <Box minH="100vh" bg="bg.subtle" pt="8" pb="20">
      <Container maxW="4xl">
        <Box maxW="750px" mx="auto">
        <Flex justify="space-between" align="center" mb="6">
          <Menu.Root
            positioning={{ placement: "bottom-start" }}
            onSelect={(e) => {
              if (e.value === NEW_JOB_SEARCH) setIsCreatingJobSearch(true);
              else if (e.value === MANAGE_JOB_SEARCHES) setIsManagingJobSearches(true);
              else selectJobSearch(Number(e.value));
            }}
          >
            <Menu.Trigger asChild>
              <Button
                variant="ghost"
                size="md"
                fontSize="lg"
                color="fg.muted"
                fontWeight="normal"
                disabled={isJobSearchesLoading}
              >
                <LuBriefcase />
                {isJobSearchesLoading
                  ? "Loading…"
                  : currentJobSearch
                    ? `${currentJobSearch.name} (${overallTotal > 0 ? overallTotal : total})`
                    : "Select Job Search"}
                <LuChevronsUpDown />
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  {activeJobSearches.length === 0 && (
                    <Text textStyle="xs" color="fg.subtle" px="3" py="1.5">
                      No active job searches
                    </Text>
                  )}
                  {activeJobSearches.map((js) => (
                    <Menu.Item key={js.id} value={String(js.id)}>
                      {js.name}
                      {js.id === currentJobSearchId && <LuCheck />}
                    </Menu.Item>
                  ))}
                  <Menu.Separator />
                  <Menu.Item value={NEW_JOB_SEARCH}>
                    <LuPlus /> New Job Search
                  </Menu.Item>
                  {jobSearches.length > 0 && (
                    <Menu.Item value={MANAGE_JOB_SEARCHES}>
                      <LuSettings /> Manage Job Searches
                    </Menu.Item>
                  )}
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
          <Menu.Root
            positioning={{ placement: "bottom-end" }}
            onSelect={(e) => {
              if (e.value === "preferences") navigate("/account");
              else if (e.value === "logout") logout();
            }}
          >
            <Menu.Trigger asChild>
              <Button
                aria-label="Account menu"
                title="Account"
                variant="ghost"
                size="md"
                color="fg.muted"
                rounded="sm"
              >
                <LuUser /> Account
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item value="preferences">
                    <LuSettings /> Preferences
                  </Menu.Item>
                  <Menu.Item value="logout">
                    <LuLogOut /> Sign Out
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Flex>

        {isJobSearchesLoading ? (
          <Center py="10">
            <Spinner color="fg.muted" />
          </Center>
        ) : currentJobSearchId === null ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <LuBriefcase />
              </EmptyState.Indicator>
              <EmptyState.Title>No job search yet</EmptyState.Title>
              <EmptyState.Description>
                Create a job search to start tracking applications — e.g. "2025 Job Search".
              </EmptyState.Description>
              <Button onClick={() => setIsCreatingJobSearch(true)} colorPalette="blue" mt="4">
                <LuPlus /> Create Job Search
              </Button>
            </EmptyState.Content>
          </EmptyState.Root>
        ) : (
          <>
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          w="full"
          h="20"
          mt="14"
          mb="3"
          borderStyle="dashed"
          borderColor="border.emphasized"
          color="fg.muted"
          justifyContent="center"
          _hover={{ color: "blue.fg", borderColor: "blue.emphasized" }}
          _focusVisible={{ outline: "none", boxShadow: "none" }}
        >
          <LuPlus /> Add Application
        </Button>

        <Box mb="3">
        <Flex gap="2" wrap="wrap" align="center">
          <Flex gap="0" align="center" ml="auto">
          {isSearchVisible ? (
            <Box position="relative" w="210px" mr="1">
              <Box
                position="absolute"
                left="3"
                top="50%"
                transform="translateY(-50%)"
                color="fg.subtle"
                pointerEvents="none"
              >
                <LuSearch size={16} />
              </Box>
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeSearch();
                }}
                onBlur={() => {
                  if (!searchQuery.trim()) closeSearch();
                }}
                placeholder="Type to search…"
                rounded="full"
                h="7"
                ps="8"
                pe="7"
                border="none"
                _focus={{ boxShadow: "none", outline: "none" }}
                _focusVisible={{ boxShadow: "none", outline: "none" }}
              />
              <IconButton
                onClick={closeSearch}
                aria-label="Close search"
                title="Close search"
                variant="subtle"
                size="2xs"
                color="fg.muted"
                rounded="full"
                position="absolute"
                right="1"
                top="50%"
                transform="translateY(-50%)"
                _hover={{ color: "fg" }}
              >
                <LuX />
              </IconButton>
            </Box>
          ) : (
            <IconButton
              onClick={() => setIsSearchVisible(true)}
              aria-label="Search"
              title="Search"
              variant="ghost"
              size="sm"
              color="fg.muted"
              rounded="sm"
              h="7"
            >
              <LuSearch />
            </IconButton>
          )}

          <Popover.Root positioning={{ placement: "bottom-start" }}>
            <Popover.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                color={activeFilterCount > 0 ? "blue.500" : "fg.muted"}
                rounded="sm"
                h="7"
                px="2"
                title="Filter"
              >
                <LuListFilter />
              </Button>
            </Popover.Trigger>
            <Portal>
              <Popover.Positioner>
                <Popover.Content w="auto">
                  <Popover.Body>
                    <Flex gap="2" wrap="wrap" align="center">
                      <Menu.Root
                        positioning={{ placement: "bottom-start" }}
                        onSelect={(e) =>
                          setTypeFilter(e.value === ALL_TYPES ? null : (e.value as ApplicationType))
                        }
                      >
                        <Menu.Trigger asChild>
                          <Button variant="outline" size="sm" color={typeFilter ? "blue.500" : "fg.muted"} rounded="full" h="7">
                            {typeFilter ? `${typeFilter}` : "Any Type"}
                            <LuChevronDown />
                          </Button>
                        </Menu.Trigger>
                        <Portal>
                          <Menu.Positioner>
                            <Menu.Content>
                              <Menu.Item value={ALL_TYPES}>
                                Any Type
                                {!typeFilter && <LuCheck />}
                              </Menu.Item>
                              {Object.values(ApplicationType).map((type) => (
                                <Menu.Item key={type} value={type}>
                                  {type}
                                  {typeFilter === type && <LuCheck />}
                                </Menu.Item>
                              ))}
                            </Menu.Content>
                          </Menu.Positioner>
                        </Portal>
                      </Menu.Root>

                      <Menu.Root
                        positioning={{ placement: "bottom-start" }}
                        onSelect={(e) =>
                          setStatusFilter(e.value === ALL_STATUSES ? null : (e.value as ApplicationStatus))
                        }
                      >
                        <Menu.Trigger asChild>
                          <Button variant="outline" size="sm" color={statusFilter ? "blue.500" : "fg.muted"} rounded="full" h="7">
                            {statusFilter ? `${statusFilter}` : "Any Status"}
                            <LuChevronDown />
                          </Button>
                        </Menu.Trigger>
                        <Portal>
                          <Menu.Positioner>
                            <Menu.Content>
                              <Menu.Item value={ALL_STATUSES}>
                                Any Status
                                {!statusFilter && <LuCheck />}
                              </Menu.Item>
                              {Object.values(ApplicationStatus).map((status) => (
                                <Menu.Item key={status} value={status}>
                                  {status}
                                  {statusFilter === status && <LuCheck />}
                                </Menu.Item>
                              ))}
                            </Menu.Content>
                          </Menu.Positioner>
                        </Portal>
                      </Menu.Root>

                      <Popover.Root positioning={{ placement: "bottom-start" }}>
                        <Popover.Trigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            color={appliedDateFrom || appliedDateTo ? "blue.500" : "fg.muted"}
                            rounded="full"
                            h="7"
                          >
                            {appliedDateFrom || appliedDateTo ? (
                              <>
                                {appliedDateFrom ? formatShortDate(appliedDateFrom) : "Any"}
                                {" – "}
                                {appliedDateTo ? formatShortDate(appliedDateTo) : "Any"}
                              </>
                            ) : (
                              "When"
                            )}
                            <LuChevronDown />
                          </Button>
                        </Popover.Trigger>
                        <Portal>
                          <Popover.Positioner>
                            <Popover.Content>
                              <Popover.Body>
                                <Flex direction="column" gap="2">
                                  <Box>
                                    <Text textStyle="xs" color="fg.muted" mb="1">
                                      Applied from
                                    </Text>
                                    <Input
                                      type="date"
                                      value={appliedDateFrom}
                                      onChange={(e) => setAppliedDateFrom(e.target.value)}
                                      size="sm"
                                    />
                                  </Box>
                                  <Box>
                                    <Text textStyle="xs" color="fg.muted" mb="1">
                                      Applied to
                                    </Text>
                                    <Input
                                      type="date"
                                      value={appliedDateTo}
                                      onChange={(e) => setAppliedDateTo(e.target.value)}
                                      size="sm"
                                    />
                                  </Box>
                                  {(appliedDateFrom || appliedDateTo) && (
                                    <Button
                                      onClick={() => {
                                        setAppliedDateFrom("");
                                        setAppliedDateTo("");
                                      }}
                                      variant="ghost"
                                      size="xs"
                                      color="fg.muted"
                                    >
                                      <LuX /> Clear
                                    </Button>
                                  )}
                                </Flex>
                              </Popover.Body>
                            </Popover.Content>
                          </Popover.Positioner>
                        </Portal>
                      </Popover.Root>

                      <Popover.Root positioning={{ placement: "bottom-start" }}>
                        <Popover.Trigger asChild>
                          <Button
                            title="Advanced filter"
                            variant="outline"
                            size="sm"
                            color={hasAdvancedFilter ? "blue.500" : "fg.muted"}
                            rounded="full"
                            h="7"
                          >
                            Advanced
                            <LuChevronDown />
                          </Button>
                        </Popover.Trigger>
                        <Portal>
                          <Popover.Positioner>
                            <Popover.Content minW="200px">
                              <Popover.Body>
                                <Flex direction="column" gap="2">
                                  <AdvancedFilterCategoryPopover
                                    label="Job Titles"
                                    options={suggestions.titles}
                                    selected={advancedFilterTitles}
                                    onToggle={(value) =>
                                      setAdvancedFilterTitles((prev) => toggleSelection(prev, value))
                                    }
                                  />
                                  <AdvancedFilterCategoryPopover
                                    label="Companies"
                                    options={suggestions.companies}
                                    selected={advancedFilterCompanies}
                                    onToggle={(value) =>
                                      setAdvancedFilterCompanies((prev) => toggleSelection(prev, value))
                                    }
                                  />
                                  <AdvancedFilterCategoryPopover
                                    label="Locations"
                                    options={suggestions.locations}
                                    selected={advancedFilterLocations}
                                    onToggle={(value) =>
                                      setAdvancedFilterLocations((prev) => toggleSelection(prev, value))
                                    }
                                  />
                                  {hasAdvancedFilter && (
                                    <Button
                                      onClick={() => {
                                        setAdvancedFilterTitles([]);
                                        setAdvancedFilterCompanies([]);
                                        setAdvancedFilterLocations([]);
                                      }}
                                      variant="ghost"
                                      size="xs"
                                      color="fg.muted"
                                    >
                                      <LuX /> Clear
                                    </Button>
                                  )}
                                </Flex>
                              </Popover.Body>
                            </Popover.Content>
                          </Popover.Positioner>
                        </Portal>
                      </Popover.Root>

                      {activeFilterCount > 0 && (
                        <Button
                          onClick={() => {
                            setTypeFilter(null);
                            setStatusFilter(null);
                            setAppliedDateFrom("");
                            setAppliedDateTo("");
                            setAdvancedFilterTitles([]);
                            setAdvancedFilterCompanies([]);
                            setAdvancedFilterLocations([]);
                          }}
                          variant="ghost"
                          size="xs"
                          color="fg.muted"
                        >
                          <LuX /> Remove Filters
                        </Button>
                      )}
                    </Flex>
                  </Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Portal>
          </Popover.Root>

          <Flex gap="2">
            <Popover.Root positioning={{ placement: "bottom-end" }}>
              <Popover.Trigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  color={!isDefaultSort ? "blue.500" : "fg.muted"}
                  title="Sort"
                  rounded="sm"
                  h="7"
                  px="2"
                >
                  <LuArrowUpDown />
                </Button>
              </Popover.Trigger>
              <Portal>
                <Popover.Positioner>
                  <Popover.Content w="auto">
                    <Popover.Body>
                      <Flex gap="2" wrap="wrap" align="center">
                        <Menu.Root
                          positioning={{ placement: "bottom-start" }}
                          onSelect={(e) => setSortField(e.value as SortField)}
                        >
                          <Menu.Trigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              color={sortField !== "created_at" ? "blue.500" : "fg.muted"}
                              rounded="full"
                              h="7"
                            >
                              {sortField === "created_at" ? "Date Added" : SORT_MENU_FIELD_LABELS[sortField]}
                              <LuChevronDown />
                            </Button>
                          </Menu.Trigger>
                          <Portal>
                            <Menu.Positioner>
                              <Menu.Content>
                                <Menu.Item value="created_at">
                                  Date Added (Default)
                                  {sortField === "created_at" && <LuCheck />}
                                </Menu.Item>
                                {(Object.keys(SORT_MENU_FIELD_LABELS) as Exclude<SortField, "created_at">[]).map(
                                  (field) => (
                                    <Menu.Item key={field} value={field}>
                                      {SORT_MENU_FIELD_LABELS[field]}
                                      {sortField === field && <LuCheck />}
                                    </Menu.Item>
                                  ),
                                )}
                              </Menu.Content>
                            </Menu.Positioner>
                          </Portal>
                        </Menu.Root>

                        <Button
                          onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                          variant="outline"
                          size="sm"
                          color={sortDir !== "desc" ? "blue.500" : "fg.muted"}
                          rounded="full"
                          h="7"
                        >
                          {sortDir === "asc" ? (
                            <>
                              Sort ascending <LuArrowUp />
                            </>
                          ) : (
                            <>
                              Sort descending <LuArrowDown />
                            </>
                          )}
                        </Button>

                        {!isDefaultSort && (
                          <Button
                            onClick={() => {
                              setSortField("created_at");
                              setSortDir("desc");
                            }}
                            variant="ghost"
                            size="xs"
                            color="fg.muted"
                          >
                            <LuRotateCcw /> Restore Default
                          </Button>
                        )}
                      </Flex>
                    </Popover.Body>
                  </Popover.Content>
                </Popover.Positioner>
              </Portal>
            </Popover.Root>
          </Flex>
          </Flex>
        </Flex>
        </Box>
        </>
        )}
        </Box>

        {currentJobSearchId !== null && (
          <>
        {isAdding && (
          <ApplicationForm
            title="Add Application"
            submitLabel="Add"
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
            suggestions={suggestions}
            defaultType={currentJobSearch?.default_application_type}
            defaultCurrency={user?.default_currency}
          />
        )}

        {editingApp && (
          <ApplicationForm
            title="Edit Application"
            initial={editingApp}
            submitLabel="Save"
            onSubmit={(data) => handleEdit(editingApp.id, data)}
            onCancel={() => setEditingId(null)}
            onDelete={() => handleDelete(editingApp.id)}
            suggestions={suggestions}
          />
        )}

        {viewingApp && (
          <ApplicationDetails
            application={viewingApp}
            onClose={() => setViewingId(null)}
            onOpenNote={() => {
              setViewingId(null);
              setNoteId(viewingApp.id);
            }}
          />
        )}

        {noteApp && (
          <NoteDialog
            application={noteApp}
            onSave={(notes) => handleEdit(noteApp.id, { notes: notes || null })}
            onClose={() => setNoteId(null)}
          />
        )}

        {isLoading && (
          <Center py="10">
            <Spinner color="fg.muted" />
          </Center>
        )}
        {error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Title>{error}</Alert.Title>
          </Alert.Root>
        )}

        {!isLoading && !error && total === 0 && !isFiltered && (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <LuInbox />
              </EmptyState.Indicator>
              <EmptyState.Title>No applications yet</EmptyState.Title>
              <EmptyState.Description>
                Add your first application to start tracking.
              </EmptyState.Description>
            </EmptyState.Content>
          </EmptyState.Root>
        )}

        {!isLoading && !error && total === 0 && isFiltered && (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <LuSearchX />
              </EmptyState.Indicator>
              <EmptyState.Title>No matches</EmptyState.Title>
              <EmptyState.Description>
                No applications match the current search and filters.
              </EmptyState.Description>
            </EmptyState.Content>
          </EmptyState.Root>
        )}

        {!isLoading && !error && total > 0 && (
          <>
          <Card.Root overflow="hidden" w="full" maxW="750px" mx="auto">
            <Table.ScrollArea>
              <Table.Root
                size="sm"
                tableLayout="fixed"
                minW="660px"
                css={{
                  "& td": { paddingBlock: "1" },
                  "& th": { paddingBlock: "1.5" },
                }}
              >
              <Table.Header>
                <Table.Row bg="bg.muted">
                  <Table.ColumnHeader w="40px" textAlign="center" color="fg.muted">#</Table.ColumnHeader>
                  <SortableHeader label="Job Title" field="title" activeField={sortField} dir={sortDir} onSort={handleHeaderSort} width="250px" />
                  <SortableHeader label="Company" field="company" activeField={sortField} dir={sortDir} onSort={handleHeaderSort} width="150px" />
                  <SortableHeader label="Status" field="status" activeField={sortField} dir={sortDir} onSort={handleHeaderSort} minW="70px" />
                  <Table.ColumnHeader w="150px" color="fg.muted">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {applications.map((app, index) => (
                  <Table.Row
                      key={app.id}
                      className="group"
                      onClick={() => setEditingId(app.id)}
                      cursor="pointer"
                      bg="bg.panel"
                      _hover={{ bg: "bg.subtle" }}
                    >
                      <Table.Cell w="40px" textAlign="center">
                        <Text textStyle="sm" color="fg.subtle">
                          {index + 1}
                        </Text>
                      </Table.Cell>
                      <Table.Cell
                        style={wrappedTitleIds.has(app.id) ? { paddingBlock: "10px" } : undefined}
                      >
                        {app.url ? (
                          <Link
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            fontWeight="medium"
                            color="fg"
                            maxW="full"
                          >
                            <Text
                              ref={(el) => {
                                if (el) titleTextRefs.current.set(app.id, el);
                                else titleTextRefs.current.delete(app.id);
                              }}
                              lineClamp="2"
                              whiteSpace="normal"
                            >
                              {app.title}
                            </Text>
                            <LuExternalLink size={12} style={{ flexShrink: 0 }} />
                          </Link>
                        ) : (
                          <Text
                            ref={(el) => {
                              if (el) titleTextRefs.current.set(app.id, el);
                              else titleTextRefs.current.delete(app.id);
                            }}
                            fontWeight="medium"
                            lineClamp="2"
                            whiteSpace="normal"
                          >
                            {app.title}
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell
                        style={wrappedCompanyIds.has(app.id) ? { paddingBlock: "10px" } : undefined}
                      >
                        <Text
                          ref={(el) => {
                            if (el) companyTextRefs.current.set(app.id, el);
                            else companyTextRefs.current.delete(app.id);
                          }}
                          textStyle="sm"
                          color="fg"
                          lineClamp="2"
                          whiteSpace="normal"
                        >
                          {app.company}
                        </Text>
                      </Table.Cell>
                      <Table.Cell
                        minW="70px"
                        onClick={(e) => e.stopPropagation()}
                        cursor="default"
                      >
                        <StatusBadge
                          status={app.status}
                          onClick={() => handleSetStatus(app, nextStatus(app.status))}
                        />
                      </Table.Cell>
                      <Table.Cell
                        onClick={(e) => e.stopPropagation()}
                        cursor="default"
                      >
                        <Flex
                          align="center"
                          justify="flex-end"
                          gap="0.5"
                          opacity="0"
                          _groupHover={{ opacity: 1 }}
                        >
                          <IconButton
                            onClick={() => handleSetStatus(app, ApplicationStatus.Offer)}
                            aria-label="Mark as Offer"
                            title="Mark as Offer"
                            variant="ghost"
                            size="xs"
                            rounded="full"
                            colorPalette="green"
                          >
                            <LuTrophy />
                          </IconButton>
                          <IconButton
                            onClick={() => handleSetStatus(app, ApplicationStatus.Rejected)}
                            aria-label="Mark as Rejected"
                            title="Mark as Rejected"
                            variant="ghost"
                            size="xs"
                            rounded="full"
                            colorPalette="red"
                          >
                            <LuCircleX />
                          </IconButton>
                          <IconButton
                            onClick={() => setViewingId(app.id)}
                            aria-label="View details"
                            title="View details"
                            variant="ghost"
                            size="xs"
                            rounded="full"
                            color="fg.subtle"
                            _hover={{ color: "fg" }}
                          >
                            <LuInfo />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(app.id)}
                            aria-label="Delete application"
                            title="Delete"
                            variant="ghost"
                            size="xs"
                            rounded="full"
                            colorPalette="red"
                            color="fg.subtle"
                            _hover={{ color: "fg.error" }}
                          >
                            <LuTrash2 />
                          </IconButton>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                ))}
              </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </Card.Root>

          <Box maxW="750px" mx="auto">
          <Text
            position="sticky"
            bottom="3"
            zIndex="docked"
            textStyle="xs"
            color="fg.subtle"
            w="40px"
            textAlign="center"
            mt="1"
            bg="bg.panel"
            borderWidth="1px"
            borderColor="border.subtle"
            rounded="full"
            py="0.5"
          >
            {applications.length}/{overallTotal > 0 ? overallTotal : total}
          </Text>
          </Box>

          {hasMore && (
            <Flex justify="center" mt="4">
              <Button
                onClick={loadMore}
                loading={isLoadingMore}
                variant="outline"
                size="sm"
                color="fg.muted"
              >
                Load More
              </Button>
            </Flex>
          )}

          </>
        )}
          </>
        )}

        {isCreatingJobSearch && (
          <CreateJobSearchDialog
            onSubmit={handleCreateJobSearch}
            onCancel={() => setIsCreatingJobSearch(false)}
          />
        )}

        {isManagingJobSearches && (
          <ManageJobSearchesDialog
            jobSearches={jobSearches}
            onUpdate={handleUpdateJobSearch}
            onToggleArchive={handleToggleArchiveJobSearch}
            onDelete={handleDeleteJobSearch}
            onClose={() => setIsManagingJobSearches(false)}
          />
        )}
      </Container>
    </Box>
  );
}
