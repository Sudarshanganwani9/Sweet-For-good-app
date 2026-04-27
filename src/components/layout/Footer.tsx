import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border mt-32">
      <div className="container py-12 grid md:grid-cols-4 gap-8 text-sm">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-bold text-lg mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-primary grid place-items-center">
              <Heart className="w-4 h-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-gradient">SwingForGood</span>
          </div>
          <p className="text-muted-foreground max-w-sm">
            Track your scores. Win monthly draws. Fund a cause that moves you. Every swing, a small revolution.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Platform</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/charities" className="hover:text-foreground">Charities</Link></li>
            <li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li>
            <li><Link to="/draws" className="hover:text-foreground">Recent draws</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Account</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
            <li><Link to="/auth?mode=signup" className="hover:text-foreground">Sign up</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SwingForGood — A Digital Heroes sample build.
      </div>
    </footer>
  );
}