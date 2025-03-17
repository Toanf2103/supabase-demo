// frontend/src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h2 className="text-3xl font-bold text-indigo-600 mb-4">404</h2>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Trang không tồn tại</h3>
        <p className="text-gray-600 mb-6">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition inline-block"
        >
          Quay lại trang chủ
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;