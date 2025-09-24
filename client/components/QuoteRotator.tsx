import { useEffect, useMemo, useState } from "react";

interface Quote {
  text: string;
  author?: string;
}

const QUOTES: Quote[] = [
  { text: "La libertad del pueblo es el fundamento de toda ley justa", author: "inspirado en John Locke" },
  { text: "El gobierno existe por el consentimiento de los gobernados", author: "Thomas Jefferson" },
  { text: "Donde hay libertad, hay progreso", author: "Milton Friedman" },
  { text: "El hombre nace libre, pero en todas partes está encadenado", author: "Rousseau" },
  { text: "La razón debe guiar las leyes, no la tiranía", author: "Voltaire" },
  { text: "El poder debe derivarse del pueblo", author: "James Madison" },
  { text: "La libertad, cuando empieza a echar raíces, es una planta de rápido crecimiento", author: "George Washington" },
  { text: "Los derechos de los individuos son la base de un gobierno justo", author: "John Adams" },
  { text: "Quien pone la libertad por encima del orden pronto pierde ambas", author: "John Stuart Mill" },
  { text: "Nadie es más esclavo que quien falsamente cree ser libre", author: "Goethe" },
  { text: "El mercado es un proceso de descubrimiento", author: "F. A. Hayek" },
  { text: "La libertad económica es condición necesaria para la libertad política", author: "Mises" },
  { text: "El monopolio del poder conduce al abuso", author: "Diderot" },
  { text: "El Estado es esa gran ficción por la que todos tratan de vivir a expensas de todos", author: "Frédéric Bastiat" },
  { text: "El precio de la libertad es la eterna vigilancia", author: "Thomas Jefferson" },
  { text: "La libertad no es un medio para un fin político superior; es en sí misma el fin político más alto", author: "Lord Acton" },
  { text: "La propiedad es un derecho natural del hombre", author: "John Locke" },
  { text: "La libertad de expresión es la base de toda otra libertad", author: "Voltaire" },
  { text: "Sin libertad, la ley es mera fuerza", author: "Rothbard" },
  { text: "La sociedad prospera cuando el individuo es libre para perseguir su felicidad", author: "Adam Smith" },
  { text: "La libertad consiste en poder hacer lo que no perjudica a los demás", author: "Rousseau" },
  { text: "Las leyes sabias y justas son las que protegen los derechos naturales", author: "Madison" },
  { text: "El comercio es un intercambio de beneficios", author: "Adam Smith" },
  { text: "La función propia del gobierno es proteger la libertad", author: "Jefferson" },
  { text: "Quien no quiere razonar es un fanático; quien no puede, un tonto; quien no se atreve, un esclavo", author: "Byron" },
  { text: "La libertad nunca está a más de una generación de perderse", author: "Ronald Reagan" },
  { text: "El mercado libre no es perfecto, pero la alternativa es peor", author: "Milton Friedman" },
  { text: "La tolerancia es el sello de las mentes libres", author: "Voltaire" },
  { text: "Donde no hay ley, no hay libertad", author: "John Locke" },
];

function durationFor(text: string) {
  const len = text.length;
  // 10s to 20s depending on length
  const ms = Math.min(20000, Math.max(10000, len * 140));
  return ms;
}

export default function QuoteRotator() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const quote = useMemo(() => QUOTES[index % QUOTES.length], [index]);
  const fade = 260; // ms for fade

  useEffect(() => {
    let tHide: ReturnType<typeof setTimeout> | undefined;
    let tNext: ReturnType<typeof setTimeout> | undefined;
    const ms = durationFor(quote.text);
    tHide = setTimeout(() => {
      setVisible(false);
      tNext = setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, fade);
    }, ms);

    return () => {
      if (tHide) clearTimeout(tHide);
      if (tNext) clearTimeout(tNext);
    };
  }, [index, quote.text]);

  return (
    <div aria-live="polite" className="text-center text-sm md:text-base text-muted-foreground select-none">
      <p className={`italic transition-opacity duration-${fade} ${visible ? "opacity-100" : "opacity-0"}`}>
        “{quote.text}”{quote.author ? ` ~ ${quote.author}` : ""}
      </p>
    </div>
  );
}
