import Header from '../components/Header';
import FlipbookViewer from '../components/FlipbookViewer';
import styles from './Home.module.css';

/**
 * Home Page Component
 * Displays the PDF Flipbook viewer
 */
function Home() {
  return (
    <div className={styles.pageContainer}>
      <Header />
      <main className={styles.mainContent}>
        <FlipbookViewer pdfUrl="/kalocsai_kollegium.pdf" />
      </main>
    </div>
  );
}

export default Home;
