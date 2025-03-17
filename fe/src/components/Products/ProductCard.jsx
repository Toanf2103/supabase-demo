// frontend/src/components/Products/ProductCard.jsx
import { Link } from 'react-router-dom';

function ProductCard({ product }) {
  const { id, name, description, price, image_url, is_owner } = product;

  // Hàm để format giá tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition">
      <div className="h-48 bg-gray-200 overflow-hidden">
        {image_url ? (
          <img 
            src={image_url} 
            alt={name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <span className="text-gray-500">Không có ảnh</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{name}</h3>
        <p className="text-indigo-600 font-bold mb-2">{formatPrice(price)}</p>
        
        {description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>
        )}
        
        <div className="flex space-x-2">
          <Link 
            to={`/products/${id}`}
            className="flex-1 px-3 py-1.5 text-sm bg-indigo-600 text-white text-center rounded hover:bg-indigo-700 transition"
          >
            Chi tiết
          </Link>
          
          {is_owner && (
            <Link 
              to={`/products/edit/${id}`}
              className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 text-center rounded hover:bg-gray-300 transition"
            >
              Chỉnh sửa
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;