// ── API response wrappers ────────────────────────────────────────────

export interface FractalItem<T> {
  object: string;
  attributes: T;
}

export interface PaginationMeta {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
  links: { next?: string; previous?: string };
}

export interface FractalList<T> {
  object: "list";
  data: FractalItem<T>[];
  meta: { pagination: PaginationMeta };
}

// ── Shared / utility ─────────────────────────────────────────────────

export interface PaginationQuery {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  per_page?: number;
}

export interface ServerLimits {
  memory: number;
  swap: number;
  disk: number;
  io: number;
  cpu: number;
  threads: string | null;
  oom_disabled: boolean;
}

export interface FeatureLimits {
  databases: number;
  allocations: number;
  backups: number;
}

// ── Application API types ────────────────────────────────────────────

export interface User {
  id: number;
  external_id: string | null;
  uuid: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  language: string;
  root_admin: boolean;
  "2fa": boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserParams {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password?: string;
  root_admin?: boolean;
  language?: string;
  external_id?: string;
}

export interface UpdateUserParams extends Partial<CreateUserParams> {}

export interface Node {
  id: number;
  uuid: string;
  public: boolean;
  name: string;
  description: string | null;
  location_id: number;
  fqdn: string;
  scheme: "http" | "https";
  behind_proxy: boolean;
  maintenance_mode: boolean;
  memory: number;
  memory_overallocate: number;
  disk: number;
  disk_overallocate: number;
  upload_size: number;
  daemon_listen: number;
  daemon_sftp: number;
  daemon_base: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNodeParams {
  name: string;
  location_id: number;
  fqdn: string;
  scheme: "http" | "https";
  memory: number;
  memory_overallocate: number;
  disk: number;
  disk_overallocate: number;
  upload_size: number;
  daemon_sftp: number;
  daemon_listen: number;
  daemon_base?: string;
  description?: string;
  public?: boolean;
  behind_proxy?: boolean;
  maintenance_mode?: boolean;
}

export interface UpdateNodeParams extends Partial<CreateNodeParams> {}

export interface NodeConfiguration {
  debug: boolean;
  uuid: string;
  token_id: string;
  token: string;
  api: { host: string; port: number; ssl: { enabled: boolean } };
  system: { data: string; sftp: { bind_port: number } };
  allowed_mounts: string[];
  remote: string;
}

export interface Location {
  id: number;
  short: string;
  long: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationParams {
  short: string;
  long?: string;
}

export interface Allocation {
  id: number;
  ip: string;
  alias: string | null;
  port: number;
  notes: string | null;
  assigned: boolean;
}

export interface CreateAllocationParams {
  ip: string;
  ports: string[];
  alias?: string;
}

/** Admin-view server (Application API) */
export interface AppServer {
  id: number;
  external_id: string | null;
  uuid: string;
  identifier: string;
  name: string;
  description: string;
  status: string | null;
  suspended: boolean;
  limits: ServerLimits;
  feature_limits: FeatureLimits;
  user: number;
  node: number;
  allocation: number;
  nest: number;
  egg: number;
  container: {
    startup_command: string;
    image: string;
    installed: number;
    environment: Record<string, string>;
  };
  updated_at: string;
  created_at: string;
}

export interface CreateServerParams {
  name: string;
  user: number;
  egg: number;
  docker_image: string;
  startup: string;
  environment: Record<string, string>;
  limits: {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
  };
  feature_limits: {
    databases: number;
    allocations: number;
    backups: number;
  };
  allocation: {
    default: number;
    additional?: number[];
  };
  deploy?: {
    locations: number[];
    dedicated_ip: boolean;
    port_range: string[];
  };
  description?: string;
  external_id?: string;
  start_on_completion?: boolean;
  skip_scripts?: boolean;
  oom_disabled?: boolean;
}

export interface UpdateServerDetailsParams {
  name?: string;
  user?: number;
  external_id?: string;
  description?: string;
}

export interface UpdateServerBuildParams {
  allocation?: number;
  memory?: number;
  swap?: number;
  disk?: number;
  io?: number;
  cpu?: number;
  threads?: string | null;
  feature_limits?: Partial<FeatureLimits>;
  oom_disabled?: boolean;
}

export interface UpdateServerStartupParams {
  startup?: string;
  environment?: Record<string, string>;
  egg?: number;
  image?: string;
  skip_scripts?: boolean;
}

export interface AppDatabase {
  id: number;
  server: number;
  host: number;
  database: string;
  username: string;
  remote: string;
  max_connections: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDatabaseParams {
  database: string;
  remote: string;
  host: number;
}

export interface Nest {
  id: number;
  uuid: string;
  author: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Egg {
  id: number;
  uuid: string;
  name: string;
  nest: number;
  author: string;
  description: string | null;
  docker_image: string;
  docker_images: Record<string, string>;
  startup: string;
  created_at: string;
  updated_at: string;
}

// ── Client API types ─────────────────────────────────────────────────

/** User-facing server (Client API) */
export interface ClientServer {
  server_owner: boolean;
  identifier: string;
  internal_id: number;
  uuid: string;
  name: string;
  node: string;
  is_node_under_maintenance: boolean;
  sftp_details: { ip: string; port: number };
  description: string;
  limits: ServerLimits;
  invocation: string;
  docker_image: string;
  egg_features: string[];
  feature_limits: FeatureLimits;
  status: string | null;
  is_suspended: boolean;
  is_installing: boolean;
  is_transferring: boolean;
}

export interface ResourceUsage {
  current_state: "running" | "starting" | "stopping" | "offline";
  is_suspended: boolean;
  resources: {
    memory_bytes: number;
    cpu_absolute: number;
    disk_bytes: number;
    network_rx_bytes: number;
    network_tx_bytes: number;
    uptime: number;
  };
}

export interface WebSocketCredentials {
  token: string;
  socket: string;
}

export type PowerAction = "start" | "stop" | "restart" | "kill";

export interface FileObject {
  name: string;
  mode: string;
  mode_bits: string;
  size: number;
  is_file: boolean;
  is_symlink: boolean;
  mimetype: string;
  created_at: string;
  modified_at: string | null;
}

export interface Backup {
  uuid: string;
  is_successful: boolean;
  is_locked: boolean;
  name: string;
  ignored_files: string[];
  checksum: string | null;
  bytes: number;
  created_at: string;
  completed_at: string | null;
}

export interface CreateBackupParams {
  name?: string;
  ignored?: string;
  is_locked?: boolean;
}

export interface Schedule {
  id: number;
  name: string;
  cron: {
    day_of_week: string;
    day_of_month: string;
    month: string;
    hour: string;
    minute: string;
  };
  is_active: boolean;
  is_processing: boolean;
  only_when_online: boolean;
  last_run_at: string | null;
  next_run_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleParams {
  name: string;
  minute: string;
  hour: string;
  day_of_week: string;
  day_of_month: string;
  month: string;
  is_active?: boolean;
  only_when_online?: boolean;
}

export interface ScheduleTask {
  id: number;
  sequence_id: number;
  action: "command" | "power" | "backup";
  payload: string;
  time_offset: number;
  is_queued: boolean;
  continue_on_failure: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleTaskParams {
  action: "command" | "power" | "backup";
  payload: string;
  time_offset: number;
  continue_on_failure?: boolean;
}

export interface ClientDatabase {
  id: string;
  host: { address: string; port: number };
  name: string;
  username: string;
  connections_from: string;
  max_connections: number;
  password?: string;
}

export interface CreateClientDatabaseParams {
  database: string;
  remote: string;
}

export interface NetworkAllocation {
  id: number;
  ip: string;
  ip_alias: string | null;
  port: number;
  notes: string | null;
  is_default: boolean;
}

export interface Subuser {
  uuid: string;
  username: string;
  email: string;
  image: string;
  "2fa_enabled": boolean;
  created_at: string;
  permissions: string[];
}

export interface CreateSubuserParams {
  email: string;
  permissions: string[];
}

export interface StartupVariable {
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  server_value: string;
  is_editable: boolean;
  rules: string;
}

export interface AccountInfo {
  id: number;
  admin: boolean;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  language: string;
}

export interface ApiKey {
  identifier: string;
  description: string;
  allowed_ips: string[];
  last_used_at: string | null;
  created_at: string;
}

export interface SshKey {
  name: string;
  fingerprint: string;
  public_key: string;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  batch: string | null;
  event: string;
  is_api: boolean;
  ip: string | null;
  description: string | null;
  properties: Record<string, unknown>;
  has_additional_metadata: boolean;
  timestamp: string;
}
