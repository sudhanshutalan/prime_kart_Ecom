import { useState } from "react";
import { X, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toggleSearchBar } from "../../store/slices/popupSlice.js";

const SearchOverlay = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isSearchBarOpen } = useSelector((state) => state.popup);
  if (!isSearchBarOpen) return null;

  const handleSearch = () => {
    if (searchQuery.trim() !== "") {
      dispatch(toggleSearchBar());
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };
  return (
    <>
      <div className="fixed inset-0 z-50">
        {/* GLASS BACKGROUND */}
        <div className="absolute inset-0 backdrop-blur-md bg-[hsla(var(--glass-bg))]">
          {/* SEARCH CONTAINER */}
          <div className="relative z-10 animate-slide-in-from-top ">
            <div className="glass-panel m-6 max-w-2xl mx-auto p-6 rounded-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-primary">
                  Search Products
                </h2>
                <button
                  onClick={() => dispatch(toggleSearchBar())}
                  className="p-2 rounded-lg glass-card hover:glow-on-hover animate-smooth"
                >
                  <X className="w-5 h-5 text-primary" />
                </button>
              </div>
              <div className="relative">
                {/* SEARCH ICON BUTTON */}
                <button className="absolute top-1/2 left-2 -translate-y-1/2 w-5 h-5 text-primary">
                  <Search className="w-5 h-5 text-primary" />
                </button>

                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  className="w-full pl-12 py-2 pr-4 bg-secondary border border-border rounded-lg focus:outline-none text-foreground placeholder-muted-foreground"
                  autoFocus
                />
              </div>
              <div className="mt-6 text-center text-muted-foreground">
                <p>Start typing to search for products...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchOverlay;
