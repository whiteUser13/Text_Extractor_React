import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import routes from '../../routes';

const Header: React.FC = () => {
const [isMenuOpen, setIsMenuOpen] = useState(false);
const location = useLocation();
const navigation = routes.filter(route => route.visible !== false);

return (
    <header className="bg-white shadow-md sticky top-0 z-10">
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
        <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
            {/* 请替换为您的网站logo */}
            <img
                className="h-8 w-auto"
                src={`https://miaoda-site-img.cdn.bcebos.com/placeholder/code_logo_default.png`}
                alt="网站logo"
            />
            {/* 请替换为您的网站名称 */}
            <span className="ml-2 text-xl font-bold text-blue-600">网站名称</span>
            </Link>
        </div>

        {/* 当只有一个页面时，可以移除整个navigation部分 */}
        <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
            <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 text-base font-medium rounded-md ${
                location.pathname === item.path
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                } transition duration-300`}
            >
                {item.name}
            </Link>
            ))}
        </div>
        </div>
    </nav>
    </header>
);
};

export default Header;