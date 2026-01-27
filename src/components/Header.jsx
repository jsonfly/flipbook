import styles from './Header.module.css';

/**
 * Header Component
 * Displays the application header with title
 */
function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>
        <span className={styles.icon}>📖</span>
        PDF Flipbook Viewer
      </h1>
    </header>
  );
}

export default Header;
