import FlipbookViewer from '../components/FlipbookViewer';
import styles from './Home.module.css';

/**
 * Home Page Component
 * Displays the PDF Flipbook viewer
 */
function Home() {
  return (
    <main className={styles.mainContent}>
      <FlipbookViewer pdfUrl="/kalocsai_kollegium.pdf" />
    </main>
  );
}

export default Home;
