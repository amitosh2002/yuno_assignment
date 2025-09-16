

// export default ProductStore;
import React, { useState } from 'react';
import {
  ShoppingCart, Star, Plus, Minus, CreditCard, User,
  CheckCircle, AlertCircle, X, Package, Trash2
} from 'lucide-react';
import axios from 'axios';
import "./Styles/testPage.scss";
import CardForm from './cardPay';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  reviews: number;
  description: string;
  sku: string;
  category: string;
}

interface CartItem extends Product { quantity: number }
// interface Customer { yunoCustomerId?: string }
interface Customer {
  yunoCustomerId: string;
  // Add any other properties the customer object has, e.g.,
  // name: string;
  // email: string;
}
interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface CustomerForm {
  name: string;
  email: string;
  address: Address;
}

interface OrderData { _id: string }

interface CheckoutSessionResp { checkoutSession: string; clientSecret?: string | null }

const ProductStore = () => {
  // Products
  const [products] = useState<Product[]>([
    {
      id: 1, name: "Premium Wireless Headphones", price: 299.99,
      originalPrice: 399.99, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
      rating: 4.8, reviews: 234, description: "High-quality wireless headphones with noise cancellation and 30-hour battery life.",
      sku: "HEAD-001", category: "Electronics"
    },
    {
      id: 2, name: "Smart Fitness Watch", price: 199.99,
      originalPrice: 249.99, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
      rating: 4.6, reviews: 189, description: "Track your fitness goals with this advanced smartwatch featuring heart rate monitoring.",
      sku: "WATCH-001", category: "Electronics"
    },
    {
      id: 3, name: "Professional Laptop", price: 1299.99,
      originalPrice: 1499.99, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop",
      rating: 4.9, reviews: 456, description: "High-performance laptop perfect for professionals and creative work.",
      sku: "LAPTOP-001", category: "Computers"
    },
    {
      id: 4, name: "Wireless Speaker", price: 149.99,
      originalPrice: 199.99, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop",
      rating: 4.5, reviews: 123, description: "Portable wireless speaker with exceptional sound quality and 24-hour battery.",
      sku: "SPEAKER-001", category: "Audio"
    }
  ]);

  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [customer, setCustomer] = useState<unknown>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSessionResp | null>(null);

  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    name: '', email: '',
    address: { street: '', city: '', state: '', zip: '', country: 'US' }
  });
  const [country, setCountry] = useState<'US' | 'CO' | 'BR' | 'AR' | 'CL'>('US');

  const API_BASE = 'http://localhost:5000/api';

  // Utility
  const showMessage = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'error') { setError(message); setSuccess(''); }
    else { setSuccess(message); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 5000);
  };

  const calculateDiscount = (original: number, current: number) => Math.round(((original - current) / original) * 100);
  const getTotalItems = () => cart.reduce((total, item) => total + item.quantity, 0);
  const getSubtotal = () => cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const getTax = () => getSubtotal() * 0.08;
  const getShipping = () => getSubtotal() > 100 ? 0 : 9.99;
  const getTotal = () => getSubtotal() + getTax() + getShipping();

  // Cart functions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const exist = prev.find(i => i.id === product.id);
      if (exist) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      const newItem: CartItem = { ...product, quantity: 1 };
      return [...prev, newItem];
    });
    showMessage(`${product.name} added to cart!`);
  };

  const updateQuantity = (id: number, qty: number) => {
    if (qty === 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
    showMessage('Item removed from cart');
  };

  // Backend calls
  const createCustomer = async () => {
    try {
      setLoading(true);
      const { data } = await axios.post(`${API_BASE}/customers`, customerForm);
      setCustomer(data.user);
      console.log("Customer:", data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      showMessage('Customer created!');
      return data.user;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      showMessage(e.response?.data?.error || 'Failed to create customer', 'error');
      throw err;
    } finally { setLoading(false); }
  };

  const createOrder = async () => {
    try {
      setLoading(true);
      const payload = {
        items: cart.map(i => ({
          name: i.name, description: i.description, price: i.price, quantity: i.quantity, sku: i.sku, category: i.category
        })),
        subtotal: getSubtotal(),
        tax: getTax(),
        shipping: getShipping(),
        totalAmount: getTotal(),
        currency: 'USD',
        shippingAddress: customerForm.address
      };
      const { data } = await axios.post(`${API_BASE}/orders`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setOrderData(data.order as OrderData);
      showMessage('Order created!');
      return data.order as OrderData;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      showMessage(e.response?.data?.error || 'Failed to create order', 'error');
      throw err;
    } finally { setLoading(false); }
  };

  const createCheckoutSession = async (orderId: string) => {
    try {
      setLoading(true);
      const { data } = await axios.post(`${API_BASE}/payments/checkout-sessions`, { orderId, country }, { headers: { Authorization: `Bearer ${token}` } });
      setCheckoutSession(data as CheckoutSessionResp);
      showMessage('Checkout session created!');
      return data as CheckoutSessionResp;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      showMessage(e.response?.data?.error || 'Failed to create checkout session', 'error');
      throw err;
    } finally { setLoading(false); }
  };

// After creating checkout session
const handleCheckout = async () => {
  try {
    if (!customer) await createCustomer();
    const order = await createOrder();

    // Create checkout session first
    const checkoutData = await createCheckoutSession(order._id);
    console.log('Checkout Data:', checkoutData);

    setOrderData(order);
    setCheckoutSession(checkoutData); // set initial session
    setCurrentStep(2); // go to payment step

    // Do not pre-initialize payment here; SDK will request one-time token and call backend
  } catch (err) {
    console.error('Checkout error:', err);
  }
};

  const handleCustomerFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1] as keyof Address;
      setCustomerForm(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else setCustomerForm(prev => ({ ...prev, [name]: value } as CustomerForm));
  };

  const handlePayment = async (payment: { oneTimeToken?: string }) => {
    console.log("Payment info received:", payment);

    if (!payment.oneTimeToken) {
      showMessage("Payment token missing!", "error");
      return;
    }

    if (orderData && checkoutSession) {
      try {
        setLoading(true);

        const payload = {
          orderId: orderData._id,
          customer_session: checkoutSession.checkoutSession,
          checkout_session: checkoutSession.checkoutSession,
          oneTimeToken: payment.oneTimeToken
        } as const;

        console.log("Sending payment payload:", payload);

        const { data } = await axios.post(`${API_BASE}/payments/create-payment`, payload, { headers: { Authorization: `Bearer ${token}` } });

        console.log("Payment processed:", data);

        if (data.status === "APPROVED" || data.status === "SUCCEEDED") {
          showMessage("Payment Successful!");
          setCart([]);
          setShowCheckout(false);
          setCurrentStep(1);
          setOrderData(null);
          setCheckoutSession(null);
        } else {
          showMessage(`Payment Failed: ${data.status}`, "error");
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } }, message?: string };
        showMessage(`Payment Error: ${e.response?.data?.error || e.message}`, "error");
      } finally {
        setLoading(false);
      }
    }
  };

  // JSX
  return (
    <div className="store-container">
      {/* Header */}
      <header className="store-header">
        <div className="header-content">
          <div className="store-brand">
            <Package className="store-icon" />
            <h1 className="store-title">Yuno Store</h1>
          </div>
          <button onClick={() => setShowCart(true)} className="cart-button">
            <ShoppingCart className="cart-icon" />
            {getTotalItems() > 0 && <span className="cart-badge">{getTotalItems()}</span>}
          </button>
        </div>
      </header>

      {/* Alerts */}
      {error && <div className="alert alert-error"><AlertCircle />{error}<button onClick={() => setError('')}><X /></button></div>}
      {success && <div className="alert alert-success"><CheckCircle />{success}<button onClick={() => setSuccess('')}><X /></button></div>}

      {/* Products */}
      <main className="products-main">
        <h2 className="products-title">Premium Products</h2>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="country-select" style={{ marginRight: 8 }}>Country</label>
          <select id="country-select" value={country} onChange={(e) => setCountry(e.target.value as 'US' | 'CO' | 'BR' | 'AR' | 'CL')}>
            <option value="US">US</option>
            <option value="CO">CO</option>
            <option value="BR">BR</option>
            <option value="AR">AR</option>
            <option value="CL">CL</option>
          </select>
        </div>
        <div className="products-grid">
          {products.map(p => (
            <div key={p.id} className="product-card">
              {p.originalPrice > p.price && <div className="discount-badge">-{calculateDiscount(p.originalPrice, p.price)}%</div>}
              <img src={p.image} alt={p.name} className="product-image" />
              <div className="product-info">
                <h3 className="product-name">{p.name}</h3>
                <div className="rating-stars">
                  {[...Array(5)].map((_, i) => <Star key={i} className={`star ${i < Math.floor(p.rating) ? 'filled' : ''}`} />)}
                  <span className="reviews-count">({p.reviews})</span>
                </div>
                <p className="product-description">{p.description}</p>
                <div className="price-section">
                  <span className="current-price">${p.price}</span>
                  {p.originalPrice > p.price && <span className="original-price">${p.originalPrice}</span>}
                </div>
                <button onClick={() => addToCart(p)} className="btn btn-primary add-to-cart"><Plus /> Add to Cart</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Cart Sidebar */}
      <div className={`cart-sidebar ${showCart ? 'open' : ''}`}>
        <div className="cart-content">
          <div className="cart-header">
            <h3>Shopping Cart</h3>
            <button onClick={() => setShowCart(false)}><X /></button>
          </div>
          {cart.length === 0 ? (
            <p>Your cart is empty</p>
          ) : (
            <>
              <div className="cart-items">
                {cart.map(i => (
                  <div key={i.id} className="cart-item">
                    <img src={i.image} alt={i.name} />
                    <div className="cart-item-details">
                      <h4>{i.name}</h4>
                      <p>${i.price}</p>
                    </div>
                    <div className="cart-item-controls">
                      <button onClick={() => updateQuantity(i.id, i.quantity - 1)}><Minus /></button>
                      <span>{i.quantity}</span>
                      <button onClick={() => updateQuantity(i.id, i.quantity + 1)}><Plus /></button>
                      <button onClick={() => removeFromCart(i.id)}><Trash2 /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-summary">
                <div><span>Subtotal:</span> <span>${getSubtotal().toFixed(2)}</span></div>
                <div><span>Tax (8%):</span> <span>${getTax().toFixed(2)}</span></div>
                <div><span>Shipping:</span> <span>${getShipping().toFixed(2)}</span></div>
                <div><span>Total:</span> <span>${getTotal().toFixed(2)}</span></div>
              </div>
              <button onClick={() => { setShowCart(false); setShowCheckout(true); }} className="btn btn-primary checkout-btn"><CreditCard /> Checkout</button>
            </>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="checkout-modal">
          <div className="checkout-content">
            <div className="step-indicator">
              <div className={`step ${currentStep >= 1 ? 'active' : 'inactive'}`}><User /> Customer Info</div>
              <div className={`step ${currentStep >= 2 ? 'active' : 'inactive'}`}><CreditCard /> Payment</div>
            </div>

            {currentStep === 1 && (
              <div className="checkout-step">
                <h3>Customer Information</h3>
                <input type="text" name="name" placeholder="Full Name" value={customerForm.name} onChange={handleCustomerFormChange} required />
                <input type="email" name="email" placeholder="Email" value={customerForm.email} onChange={handleCustomerFormChange} required />
                <input type="text" name="address.street" placeholder="Street" value={customerForm.address.street} onChange={handleCustomerFormChange} required />
                <input type="text" name="address.city" placeholder="City" value={customerForm.address.city} onChange={handleCustomerFormChange} required />
                <input type="text" name="address.state" placeholder="State" value={customerForm.address.state} onChange={handleCustomerFormChange} required />
                <input type="text" name="address.zip" placeholder="ZIP" value={customerForm.address.zip} onChange={handleCustomerFormChange} required />
                <select 
                  name="address.country" 
                  value={customerForm.address.country} 
                  onChange={(e) => { 
                    handleCustomerFormChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
                    setCountry(e.target.value as 'US' | 'CO' | 'BR' | 'AR' | 'CL');
                  }} 
                  required
                >
                  <option value="" disabled>Country</option>
                  <option value="US">US</option>
                  <option value="CO">CO</option>
                  <option value="BR">BR</option>
                  <option value="AR">AR</option>
                  <option value="CL">CL</option>
                </select>
                <div className="form-actions">
                  <button onClick={() => setShowCheckout(false)}>Cancel</button>
                  <button onClick={handleCheckout} disabled={loading || !customerForm.name || !customerForm.email}>{loading ? 'Processing...' : 'Continue'}</button>
                </div>
              </div>
            )}

           {/* Step 2 - Payment */}
{currentStep === 2 && (
  <div className="checkout-step">
    <h3 className="step-title">Payment Information</h3>

    {checkoutSession?.checkoutSession ? (
      <CardForm
        orderId={orderData?._id}
        // customerForm={customerForm}
        checkoutSessionId={checkoutSession.checkoutSession}
        countryCode={country}
        customerFirstName={(customerForm?.name || '').trim().split(' ').slice(0, -1).join(' ') || (customer?.name || '').trim().split(' ')[0] || ''}
        // customerFirstName={customer?.name ||customerForm?.name}
        customerLastName={(customerForm.name || '').trim().split(' ').slice(-1)[0] || ''}
        // yunoCustomerId={customer?.yunoCustomerId}
        yunoCustomerId={customer?.yunoCustomerId || ''}
        customerEmail={customerForm.email}
        onSuccess={(data) => handlePayment(data as { oneTimeToken?: string })}
        setShowCheckout={setShowCheckout}
        onError={(e) => showMessage(e.message || 'Payment error', 'error')}
        showMessage={showMessage}


        
      />
    ) : (
      <div className="loading-payment">
        <p>Initializing payment...</p>
        {loading && <p>Please wait while we set up your payment...</p>}
      </div>
    )}

    <button
      onClick={() => setCurrentStep(1)}
      className="btn btn-secondary back-btn"
      disabled={loading}
    >
      Back
    </button>
  </div>
)}

          </div>
        </div>
      )}
    </div>
  );
};

export default ProductStore;
