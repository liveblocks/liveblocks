import childProcess from "child_process";
import util from "util";
export const execAsync = util.promisify(childProcess.exec);
