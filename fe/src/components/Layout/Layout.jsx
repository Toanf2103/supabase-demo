// frontend/src/components/Layout/Layout.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function Layout({ children }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-indigo-600">ProductManager</Link>
          
          <div className="flex items-center space-x-4">
            {currentUser && (
              <>
                <span className="text-gray-700">
                  {currentUser.profile?.display_name || currentUser.email}
                </span>
                <Link 
                  to="/products/create" 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                >
                  Thêm sản phẩm
                </Link>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                >
                  Đăng xuất
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white shadow mt-auto py-4">
        <div className="container mx-auto px-4 text-center text-gray-500">
          &copy; {new Date().getFullYear()} ProductManager - Quản lý sản phẩm với Supabase và Edge Functions
        </div>
      </footer>
    </div>
  );
}

export default Layout;