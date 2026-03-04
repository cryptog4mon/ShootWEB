import React from 'react';
import Pricing from '../components/Pricing';
import './Products.css';

const Products = () => {
    return (
        <section className="products-page">
            <div className="products-bg"></div>
            <Pricing />
        </section>
    );
};

export default Products;