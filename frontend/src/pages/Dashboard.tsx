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
  Heading,
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
  LuBan,
  LuCheck,
  LuChevronDown,
  LuDollarSign,
  LuExternalLink,
  LuInbox,
  LuInfo,
  LuLogOut,
  LuPlus,
  LuSearch,
  LuSearchX,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext";
import {
  createApplication,
  deleteApplication,
  getApplicationSuggestions,
  getApplications,
  updateApplication,
} from "../api/applications";
import { StatusBadge } from "../components/StatusBadge";
import { ApplicationForm } from "../components/ApplicationForm";
import { ApplicationDetails } from "../components/ApplicationDetails";
import { NoteDialog } from "../components/NoteDialog";
import { ApplicationStatus, ApplicationType } from "../index";
import type { ApplicationRead, ApplicationSuggestions, ApplicationsQuery } from "../index";

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
  title: "Title",
  company: "Company",
  status: "Status",
  location: "Location",
  type: "Type",
  date_applied: "Applied Date",
  deadline: "Deadline",
};

// These fields also have their own sortable table header, which already
// shows the active direction — the Sort button stays generic for them
// instead of duplicating that state.
function hasHeaderArrow(field: SortField): boolean {
  return field === "title" || field === "company" || field === "status";
}

const ALL_STATUSES = "__all__";
const ALL_TYPES = "__all_types__";

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

export function Dashboard() {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ApplicationSuggestions>(EMPTY_SUGGESTIONS);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [noteId, setNoteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<ApplicationType | null>(null);
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [advancedFilterTitles, setAdvancedFilterTitles] = useState<string[]>([]);
  const [advancedFilterCompanies, setAdvancedFilterCompanies] = useState<string[]>([]);
  const [advancedFilterLocations, setAdvancedFilterLocations] = useState<string[]>([]);
  const [advancedFilterSearch, setAdvancedFilterSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const titleTextRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());
  const companyTextRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());
  const [wrappedTitleIds, setWrappedTitleIds] = useState<Set<number>>(new Set());
  const [wrappedCompanyIds, setWrappedCompanyIds] = useState<Set<number>>(new Set());
  // Guards against an older, slower request overwriting a newer one's result.
  const requestIdRef = useRef(0);

  const isModalOpen = isAdding || editingId !== null || viewingId !== null || noteId !== null;

  const editingApp = applications.find((a) => a.id === editingId);
  const viewingApp = applications.find((a) => a.id === viewingId);
  const noteApp = applications.find((a) => a.id === noteId);

  const hasAdvancedFilter =
    advancedFilterTitles.length > 0 ||
    advancedFilterCompanies.length > 0 ||
    advancedFilterLocations.length > 0;

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
    getApplicationSuggestions()
      .then(setSuggestions)
      .catch(() => {});
  }

  useEffect(() => {
    refreshSuggestions();
  }, []);

  // Refetches page one whenever search, a filter, or sort changes.
  useEffect(() => {
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

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchQuery(searchQuery), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

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

  async function handleAdd(data: Parameters<typeof createApplication>[0]) {
    await createApplication(data);
    setIsAdding(false);
    await loadFirstPage();
    refreshSuggestions();
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
  }

  return (
    <Box minH="100vh" bg="bg.subtle" py="8">
      <Container maxW="4xl">
        <Box maxW="750px" mx="auto">
        <Flex justify="space-between" align="center" mb="16">
          <Box>
            <Heading size="xl">Applications</Heading>
            <Text textStyle="sm" color="fg.muted">
              {user?.email} ·{" "}
              {applications.length < total
                ? `${applications.length} of ${total} application${total === 1 ? "" : "s"}`
                : `${total} application${total === 1 ? "" : "s"}`}
            </Text>
          </Box>
          <Button onClick={logout} variant="ghost" size="sm" color="fg.muted">
            <LuLogOut /> Log out
          </Button>
        </Flex>

        {isSearchVisible && (
          <Flex align="center" gap="2" mb="4">
            <Box position="relative" flex="1">
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
                placeholder="Search by company, title, location, or notes..."
                ps="9"
              />
            </Box>
            <IconButton
              onClick={closeSearch}
              aria-label="Close search"
              title="Close search"
              variant="ghost"
              size="sm"
              color="fg.muted"
              _hover={{ color: "fg" }}
            >
              <LuX />
            </IconButton>
          </Flex>
        )}

        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          w="full"
          mb="4"
          borderStyle="dashed"
          color="fg.muted"
          _hover={{ color: "blue.fg", borderColor: "blue.emphasized" }}
        >
          <LuPlus /> Add Application
        </Button>

        <Box mb="4">
        <Flex gap="2" wrap="wrap" align="center">
          <Menu.Root
            positioning={{ placement: "bottom-start" }}
            onSelect={(e) =>
              setTypeFilter(e.value === ALL_TYPES ? null : (e.value as ApplicationType))
            }
          >
            <Menu.Trigger asChild>
              <Button variant="outline" size="sm" color="fg.muted" rounded="full" h="7">
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
              <Button variant="outline" size="sm" color="fg.muted" rounded="full" h="7">
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
              <Button variant="outline" size="sm" color="fg.muted" rounded="full" h="7">
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
                color={hasAdvancedFilter ? "fg" : "fg.muted"}
                rounded="full"
                h="7"
              >
                    Advanced
                    <LuChevronDown />
              </Button>
            </Popover.Trigger>
            <Portal>
              <Popover.Positioner>
                <Popover.Content minW="260px">
                  <Popover.Body>
                    <Flex direction="column" gap="3">
                      <Input
                        value={advancedFilterSearch}
                        onChange={(e) => setAdvancedFilterSearch(e.target.value)}
                        placeholder="Search titles, companies, locations..."
                        size="sm"
                      />
                      <FilterCategoryList
                        label="Titles"
                        options={suggestions.titles.filter((t) =>
                          t.toLowerCase().includes(advancedFilterSearch.trim().toLowerCase()),
                        )}
                        selected={advancedFilterTitles}
                        onToggle={(value) =>
                          setAdvancedFilterTitles((prev) => toggleSelection(prev, value))
                        }
                      />
                      <FilterCategoryList
                        label="Companies"
                        options={suggestions.companies.filter((c) =>
                          c.toLowerCase().includes(advancedFilterSearch.trim().toLowerCase()),
                        )}
                        selected={advancedFilterCompanies}
                        onToggle={(value) =>
                          setAdvancedFilterCompanies((prev) => toggleSelection(prev, value))
                        }
                      />
                      <FilterCategoryList
                        label="Locations"
                        options={suggestions.locations.filter((l) =>
                          l.toLowerCase().includes(advancedFilterSearch.trim().toLowerCase()),
                        )}
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

          <Flex gap="2" ml="auto">
            {sortField !== "created_at" && (
              <Button
                onClick={() => {
                  setSortField("created_at");
                  setSortDir("desc");
                }}
                variant="outline"
                size="sm"
                color="fg.muted"
                rounded="full"
                h="7"
              >
                Revert Sort
              </Button>
            )}

            <Menu.Root
              positioning={{ placement: "bottom-end" }}
              onSelect={(e) => {
                if (e.value === "dir:asc" || e.value === "dir:desc") {
                  setSortDir(e.value === "dir:asc" ? "asc" : "desc");
                } else {
                  setSortField(e.value as SortField);
                }
              }}
            >
              <Menu.Trigger asChild>
                <Button variant="outline" size="sm" color="fg.muted" title="Custom sort" rounded="full" h="7">
                  {sortField !== "created_at" && !hasHeaderArrow(sortField) ? (
                    <>
                      {SORT_MENU_FIELD_LABELS[sortField]}
                      {sortDir === "asc" ? <LuArrowUp /> : <LuArrowDown />}
                    </>
                  ) : (
                    <LuArrowUpDown />
                  )}
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    <Menu.Item value="dir:asc">
                      Ascending
                      {sortDir === "asc" && <LuCheck />}
                    </Menu.Item>
                    <Menu.Item value="dir:desc">
                      Descending
                      {sortDir === "desc" && <LuCheck />}
                    </Menu.Item>
                    <Menu.Separator />
                    <Menu.Item value="created_at">
                      Creation (Default)
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
          </Flex>
        </Flex>
        </Box>
        </Box>

        {isAdding && (
          <ApplicationForm
            title="Add Application"
            submitLabel="Add"
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
            suggestions={suggestions}
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
                  <SortableHeader label="Title" field="title" activeField={sortField} dir={sortDir} onSort={handleHeaderSort} width="250px" />
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
                            colorPalette="green"
                          >
                            <LuDollarSign />
                          </IconButton>
                          <IconButton
                            onClick={() => handleSetStatus(app, ApplicationStatus.Rejected)}
                            aria-label="Mark as Rejected"
                            title="Mark as Rejected"
                            variant="ghost"
                            size="xs"
                            colorPalette="red"
                          >
                            <LuBan />
                          </IconButton>
                          <IconButton
                            onClick={() => setViewingId(app.id)}
                            aria-label="View details"
                            title="View details"
                            variant="ghost"
                            size="xs"
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
      </Container>
    </Box>
  );
}
