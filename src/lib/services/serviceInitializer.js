import ChromeBookmarkRepository from '../repositories/ChromeBookmarkRepository.js';
import ChromeBookmarkTransactionManager from './ChromeBookmarkTransactionManager.js';
import BookmarkOperationExecutor from './BookmarkOperationExecutor.js';
import BookmarkRestructuringService from './BookmarkRestructuringService.js';

// Global service instances
let bookmarkRepository;
let transactionManager;
let operationExecutor;
let restructuringService;

/**
 * Initialize all services and make them available globally
 * @returns {Object} The initialized services
 */
export function initializeServices() {
  // Create repository
  bookmarkRepository = new ChromeBookmarkRepository(chrome);
  
  // Create transaction manager
  transactionManager = new ChromeBookmarkTransactionManager(bookmarkRepository, chrome);
  
  // Create operation executor
  operationExecutor = new BookmarkOperationExecutor(bookmarkRepository);
  
  // Create restructuring service
  restructuringService = new BookmarkRestructuringService(
    bookmarkRepository,
    transactionManager,
    operationExecutor
  );
  
  // Return the services for direct use if needed
  return {
    bookmarkRepository,
    transactionManager,
    operationExecutor,
    restructuringService
  };
}

/**
 * Get the bookmark repository
 * @returns {ChromeBookmarkRepository} The bookmark repository
 */
export function getBookmarkRepository() {
  if (!bookmarkRepository) {
    initializeServices();
  }
  return bookmarkRepository;
}

/**
 * Get the transaction manager
 * @returns {ChromeBookmarkTransactionManager} The transaction manager
 */
export function getTransactionManager() {
  if (!transactionManager) {
    initializeServices();
  }
  return transactionManager;
}

/**
 * Get the operation executor
 * @returns {BookmarkOperationExecutor} The operation executor
 */
export function getOperationExecutor() {
  if (!operationExecutor) {
    initializeServices();
  }
  return operationExecutor;
}

/**
 * Get the restructuring service
 * @returns {BookmarkRestructuringService} The restructuring service
 */
export function getRestructuringService() {
  if (!restructuringService) {
    initializeServices();
  }
  return restructuringService;
}