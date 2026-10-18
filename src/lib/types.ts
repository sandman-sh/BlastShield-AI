export type NodeType = 
  | 'Service'
  | 'Database'
  | 'IAMRole'
  | 'K8sPod'
  | 'Secret'
  | 'APIGateway'
  | 'LoadBalancer';

export type NodeStatus = 'HEALTHY' | 'COMPROMISED' | 'AT_RISK' | 'QUARANTINED' | 'ISOLATED' | 'FAILOVER';

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  tier: number; // 1 = Mission Critical (Checkout, Auth), 2 = Core, 3 = Auxiliary
  status: NodeStatus;
  region?: string;
  qps?: number;
  cpu_usage?: number;
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'CALLS' | 'CONNECTS_TO' | 'ASSUMES' | 'PERMITS' | 'READS_SECRET' | 'HOSTS' | 'REPLICATES_TO';
  latency_ms?: number;
  protocol?: string;
  qps?: number;
  isBlastPath?: boolean;
  isCutVertex?: boolean;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  category: 'IAM_LEAK' | 'CASCADING_LATENCY' | 'DATA_EXFILTRATION' | 'UNAUTHORIZED_INGRESS';
  sourceNodeId: string;
  sourceNodeName: string;
  timestamp: string;
  description: string;
  detectedVector: string;
}

export interface BlastRadiusReport {
  incidentId: string;
  sourceNode: GraphNode;
  impactedNodes: GraphNode[];
  impactDepthHops: number;
  totalAtRiskTier1Services: number;
  blastPathEdges: GraphEdge[];
  cutVertices: {
    nodeId: string;
    nodeName: string;
    action: string;
    trafficRedirectTarget?: string;
    preventsDownstreamOutage: boolean;
  }[];
  mathematicalSafetyProof: string;
  cypherQueryUsed: string;
  executionTimeMs: number;
  analysis: {
    algorithm: string;
    candidateCutVertices: string[];
    reachableBefore: number;
    reachableAfter: number;
    protectedTier1Paths: number;
  };
}

export interface RemediationResult {
  actionId: string;
  timestamp: string;
  actionsApplied: string[];
  nodesModified: string[];
  edgesModified: string[];
  newGraphStateStats: {
    healthyNodes: number;
    quarantinedNodes: number;
    activeEdges: number;
  };
  auditHash: string;
  auditSignature: string;
  cypherMutations: string[];
  executionTimeMs: number;
}

export interface FalkorStatusResponse {
  connected: boolean;
  host: string;
  port: number;
  graphName: string;
  nodeCount: number;
  edgeCount: number;
  version: string;
  latencyMs: number;
  availableGraphs: string[];
}

export interface AgentMemory {
  id: string;
  incidentTitle: string;
  category: string;
  sourceNodeId: string;
  learnedStrategy: string;
  confidence: number;
  successRate: string;
  timestamp: string;
}
