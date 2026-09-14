import { mongoose, type ClientSession } from "@criminals/database";

let cachedReplicaSetAvailable: boolean | null = null;

async function probeReplicaSet(): Promise<boolean> {
  if (cachedReplicaSetAvailable !== null) return cachedReplicaSetAvailable;
  try {
    const adminDb = mongoose.connection.db?.admin();
    if (!adminDb) {
      cachedReplicaSetAvailable = false;
      return false;
    }
    const info = await adminDb.command({ hello: 1 }).catch(() => null);
    if (info && (info as any).setName) {
      cachedReplicaSetAvailable = true;
      return true;
    }
    cachedReplicaSetAvailable = false;
    return false;
  } catch {
    cachedReplicaSetAvailable = false;
    return false;
  }
}

export function resetReplicaSetProbeCache() {
  cachedReplicaSetAvailable = null;
}

export interface TxExecutionContext {
  session: ClientSession | null;
  withTransaction: boolean;
}

export async function runInTxSession<T>(
  work: (ctx: TxExecutionContext) => Promise<T>,
): Promise<T> {
  const rsAvailable = await probeReplicaSet();

  if (!rsAvailable) {
    return work({ session: null, withTransaction: false });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await work({ session, withTransaction: true });
    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch {
      // ignore abort errors
    }
    try {
      session.endSession();
    } catch {
      // ignore
    }
    throw err;
  }
}

export function createWithSessionOpts(
  session: ClientSession | null,
): { session?: ClientSession } {
  return session ? { session } : {};
}
