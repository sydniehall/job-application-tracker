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
  Spinner,
  Stack,
  StackSeparator,
  Text,
} from "@chakra-ui/react";
import { LuInbox, LuPlus, LuX } from "react-icons/lu";
import { useAuth } from "../context/AuthContext";
import {
  createApplication,
  deleteApplication,
  getApplications,
  updateApplication,
} from "../api/applications";
import { StatusBadge } from "../components/StatusBadge";
import { ApplicationForm } from "../components/ApplicationForm";
import { ApplicationStatus } from "../index";
import type { ApplicationRead } from "../index";

const STATUS_CYCLE: ApplicationStatus[] = [
  ApplicationStatus.Applied,
  ApplicationStatus.Screening,
  ApplicationStatus.Interview,
  ApplicationStatus.ToApply,
];

function nextStatus(current: ApplicationStatus): ApplicationStatus {
  const index = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length];
}

function formatDate(dateApplied: string | null): string {
  if (!dateApplied) return "—";
  const [year, month, day] = dateApplied.split("T")[0].split("-");
  return `${month}/${day}/${year}`;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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
      <Container maxW="3xl">
        <Flex justify="space-between" align="center" mb="6">
          <Box>
            <Heading size="xl">Job Applications</Heading>
            <Text textStyle="sm" color="fg.muted">
              {user?.email} · {applications.length} application
              {applications.length === 1 ? "" : "s"}
            </Text>
          </Box>
          <Button onClick={logout} variant="ghost" size="sm" color="fg.muted">
            Log out
          </Button>
        </Flex>

        {!isAdding && (
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
        )}

        {isAdding && (
          <Box mb="4">
            <ApplicationForm
              submitLabel="Add"
              onSubmit={handleAdd}
              onCancel={() => setIsAdding(false)}
            />
          </Box>
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
          <Card.Root>
            <Stack gap="0" separator={<StackSeparator />}>
              {applications.map((app) =>
                editingId === app.id ? (
                  <Box key={app.id} p="4">
                    <ApplicationForm
                      initial={app}
                      submitLabel="Save"
                      onSubmit={(data) => handleEdit(app.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  </Box>
                ) : (
                  <Flex
                    key={app.id}
                    align="center"
                    justify="space-between"
                    px="4"
                    py="3"
                    className="group"
                  >
                    <Box asChild textAlign="left" flex="1" cursor="pointer">
                      <button type="button" onClick={() => setEditingId(app.id)}>
                        <Text fontWeight="medium">{app.company}</Text>
                        <Text textStyle="sm" color="fg.muted">
                          {app.role}
                        </Text>
                      </button>
                    </Box>
                    <Flex align="center" gap="3">
                      <Text textStyle="sm" color="fg.subtle">
                        {formatDate(app.date_applied)}
                      </Text>
                      <Flex
                        align="center"
                        gap="1"
                        opacity="0"
                        _groupHover={{ opacity: 1 }}
                      >
                        <Button
                          onClick={() => handleSetStatus(app, ApplicationStatus.Offer)}
                          variant="ghost"
                          size="xs"
                          colorPalette="green"
                        >
                          Offer
                        </Button>
                        <Button
                          onClick={() => handleSetStatus(app, ApplicationStatus.Rejected)}
                          variant="ghost"
                          size="xs"
                          colorPalette="red"
                        >
                          Rejection
                        </Button>
                      </Flex>
                      <StatusBadge
                        status={app.status}
                        onClick={() => handleSetStatus(app, nextStatus(app.status))}
                      />
                      <IconButton
                        onClick={() => handleDelete(app.id)}
                        aria-label="Delete application"
                        title="Delete"
                        variant="ghost"
                        size="xs"
                        colorPalette="red"
                        color="fg.subtle"
                        opacity="0"
                        _groupHover={{ opacity: 1 }}
                        _hover={{ color: "fg.error" }}
                      >
                        <LuX />
                      </IconButton>
                    </Flex>
                  </Flex>
                )
              )}
            </Stack>
          </Card.Root>
        )}
      </Container>
    </Box>
  );
}
