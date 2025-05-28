import ChromeBookmarkRepository from '../repositories/ChromeBookmarkRepository.js';
import ChromeBookmarkTransactionManager from './ChromeBookmarkTransactionManager.js';
import BookmarkOperationExecutor from './BookmarkOperationExecutor.js';
import BookmarkRestructuringService from './BookmarkRestructuringService.js';

// Singleton instances
let bookmarkRepository = null;
let transactionManager = null;
let operationExecutor = null;
let restructuringService = null;

/**
 * Initialize all services and make them available globally
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
 * Get the bookmark repository instance
 */
export function getBookmarkRepository() {
  if (!bookmarkRepository) {
    throw new Error('Services not initialized. Call initializeServices() first.');
  }
  return bookmarkRepository;
}

/**
 * Get the transaction manager instance
 */
export function getTransactionManager() {
  if (!transactionManager) {
    throw new Error('Services not initialized. Call initializeServices() first.');
  }
  return transactionManager;
}

/**
 * Get the operation executor instance
 */
export function getOperationExecutor() {
  if (!operationExecutor) {
    throw new Error('Services not initialized. Call initializeServices() first.');
  }
  return operationExecutor;
}

/**
 * Get the restructuring service instance
 */
export function getRestructuringService() {
  if (!restructuringService) {
    throw new Error('Services not initialized. Call initializeServices() first.');
  }
  return restructuringService;
}