/**
 * Interface for operation execution
 * @interface
 */
export default class IOperationExecutor {
  /**
   * Executes a series of bookmark operations
   * @param {Array} operations - Operations to execute
   * @returns {Promise<void>}
   */
  async execute(operations) {
    throw new Error('Method not implemented');
  }
}