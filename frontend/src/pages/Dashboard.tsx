import { useEffect, useState } from "react";
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
  Link,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  LuDollarSign,
  LuExternalLink,
  LuFlag,
  LuInbox,
  LuInfo,
  LuLogOut,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext";
import {
  createApplication,
  deleteApplication,
  getApplications,
  updateApplication,
} from "../api/applications";
import { StatusBadge } from "../components/StatusBadge";
import { ApplicationForm } from "../components/ApplicationForm";
import { ApplicationDetails } from "../components/ApplicationDetails";
import { ApplicationStatus } from "../index";
import type { ApplicationRead } from "../index";

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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(dateApplied: string | null): string {
  if (!dateApplied) return "—";
  const [year, month, day] = dateApplied.split("T")[0].split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const editingApp = applications.find((a) => a.id === editingId);
  const viewingApp = applications.find((a) => a.id === viewingId);

  useEffect(() => {
    getApplications()
      .then(setApplications)
      .catch(() => setError("Could not load applications."))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleAdd(data: Parameters<typeof createApplication>[0]) {
    const application = await createApplication(data);
    setApplications((prev) => [application, ...prev]);
    setIsAdding(false);
  }

  async function handleEdit(id: number, data: Parameters<typeof updateApplication>[1]) {
    const updated = await updateApplication(id, data);
    setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setEditingId(null);
  }

  async function handleSetStatus(app: ApplicationRead, status: ApplicationStatus) {
    const updated = await updateApplication(app.id, { status });
    setApplications((prev) => prev.map((a) => (a.id === app.id ? updated : a)));
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this application?")) return;
    await deleteApplication(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <Box minH="100vh" bg="bg.subtle" py="8">
      <Container maxW="5xl">
        <Flex justify="space-between" align="center" mb="6">
          <Box>
            <Heading size="xl">Your Applications</Heading>
            <Text textStyle="sm" color="fg.muted">
              {user?.email} · {applications.length} application
              {applications.length === 1 ? "" : "s"}
            </Text>
          </Box>
          <Button onClick={logout} variant="ghost" size="sm" color="fg.muted">
            <LuLogOut /> Log out
          </Button>
        </Flex>

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

        {isAdding && (
          <ApplicationForm
            title="Add Application"
            submitLabel="Add"
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
          />
        )}

        {editingApp && (
          <ApplicationForm
            title="Edit Application"
            initial={editingApp}
            submitLabel="Save"
            onSubmit={(data) => handleEdit(editingApp.id, data)}
            onCancel={() => setEditingId(null)}
          />
        )}

        {viewingApp && (
          <ApplicationDetails
            application={viewingApp}
            onClose={() => setViewingId(null)}
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

        {!isLoading && !error && applications.length === 0 && (
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

        {!isLoading && !error && applications.length > 0 && (
          <Card.Root overflow="hidden">
            <Table.ScrollArea>
              <Table.Root
                size="sm"
                tableLayout="fixed"
                minW="800px"
                css={{ "& td": { paddingBlock: "1" } }}
              >
              <Table.Header>
                <Table.Row bg="bg.muted">
                  <Table.ColumnHeader w="220px">Role</Table.ColumnHeader>
                  <Table.ColumnHeader>Company</Table.ColumnHeader>
                  <Table.ColumnHeader w="110px">Date Applied</Table.ColumnHeader>
                  <Table.ColumnHeader w="110px">Deadline</Table.ColumnHeader>
                  <Table.ColumnHeader w="105px">Status</Table.ColumnHeader>
                  <Table.ColumnHeader w="145px">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {applications.map((app) => (
                  <Table.Row
                      key={app.id}
                      className="group"
                      onClick={() => setEditingId(app.id)}
                      cursor="pointer"
                      _hover={{ bg: "bg.subtle" }}
                    >
                      <Table.Cell>
                        {app.job_url ? (
                          <Link
                            href={app.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            fontWeight="medium"
                            color="fg"
                            maxW="full"
                          >
                            <Text truncate>{app.role}</Text>
                            <LuExternalLink size={12} style={{ flexShrink: 0 }} />
                          </Link>
                        ) : (
                          <Text fontWeight="medium" truncate>
                            {app.role}
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text textStyle="sm" color="fg.muted" truncate>
                          {app.company}
                        </Text>
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <Text textStyle="sm" color="fg.subtle">
                          {formatDate(app.date_applied)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <Text textStyle="sm" color="fg.subtle">
                          {formatDate(app.deadline)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell
                        textAlign="center"
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
                          justify="center"
                          gap="0"
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
                            <LuFlag />
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
        )}
      </Container>
    </Box>
  );
}
