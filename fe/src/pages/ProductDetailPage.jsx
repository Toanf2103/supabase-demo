// frontend/src/pages/ProductDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProductById } from '../services/productService';
import { deleteProduct } from '../services/productService';

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await getProductById(id);
        setProduct(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteProduct(id);
      navigate('/', { state: { message: 'Đã xóa sản phẩm thành công' } });
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Không thể xóa sản phẩm. Vui lòng thử lại sau.');
      setIsDeleting(false);
    }
  };

  // Hàm để format giá tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  if (loading) {
    return <div className="text-center py-8">Đang tải thông tin sản phẩm...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
        <div className="mt-4">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">Không tìm thấy sản phẩm</p>
        <Link to="/" className="text-indigo-600 hover:text-indigo-800">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="md:flex">
        <div className="md:w-1/3 bg-gray-200">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-64 md:h-full object-cover"
            />
          ) : (
            <div className="w-full h-64 md:h-full flex items-center justify-center bg-gray-300">
              <span className="text-gray-500">Không có ảnh</span>
            </div>
          )}
        </div>
        
        <div className="md:w-2/3 p-6">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h1>
            
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">
                {formatPrice(product.price)}
              </p>
            </div>
          </div>
          
          {product.description && (
            <div className="mt-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Mô tả sản phẩm</h2>
              <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
            </div>
          )}
          
          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              to="/"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Quay lại
            </Link>
            
            {product.is_owner && (
              <>
                <Link
                  to={`/products/edit/${id}`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                >
                  Chỉnh sửa
                </Link>
                
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50"
                >
                  {isDeleting ? 'Đang xóa...' : 'Xóa sản phẩm'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;