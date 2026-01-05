import { useEffect, useMemo, useState } from "react";

interface Quote {
  text: string;
  author?: string;
}

const QUOTES: Quote[] = [
  {
    text: "Aquellos que renuncian a la libertad esencial a cambio de una breve seguridad temporal, merecen ni la una ni la otra.",
    author: "Benjamin Franklin",
  },
  {
    text: "El gobierno no es razón ni elocuencia; es fuerza. Como el fuego, es un sirviente peligroso y un amo temible.",
    author: "George Washington",
  },
  {
    text: "La vida, la libertad o la propiedad de ningún hombre están a salvo mientras la legislatura esté en sesión.",
    author: "Mark Twain",
  },
  {
    text: "El curso natural de las cosas es que la libertad ceda terreno y el gobierno lo gane.",
    author: "Thomas Jefferson",
  },
  {
    text: "Los hombres tímidos prefieren la calma del despotismo al mar tempestuoso de la libertad.",
    author: "Thomas Jefferson",
  },
  {
    text: "Ninguno está más irremediablemente esclavizado que quien falsamente cree ser libre.",
    author: "Johann Wolfgang von Goethe",
  },
  {
    text: "El afán de salvar a la humanidad es casi siempre una máscara para el deseo de dominarla.",
    author: "H. L. Mencken",
  },
  {
    text: "El extremismo en la defensa de la libertad no es vicio. La moderación en la persecución de la justicia no es virtud.",
    author: "Barry Goldwater",
  },
  {
    text: "De todas las tiranías, la más opresiva es aquella que se ejerce por el bien de sus víctimas.",
    author: "C. S. Lewis",
  },
  {
    text: "El fin de la ley no es abolir o reprimir, sino preservar y ensanchar la libertad.",
    author: "John Locke",
  },
  {
    text: "Un despotismo electo no era el gobierno por el que combatimos.",
    author: "Thomas Jefferson",
  },
  {
    text: "Un sinfín de leyes en un país, como un enjambre de médicos, es signo de dolencia.",
    author: "Voltaire",
  },
  {
    text: "Recuerden: la democracia no perdura jamás. Pronto se agota, se marchita y se suicida. Ninguna democracia ha evitado el suicidio.",
    author: "John Adams",
  },
  {
    text: "Una de las mayores ilusiones del mundo es creer que los males humanos se curan con leyes.",
    author: "Thomas B. Reed",
  },
  { text: "Cuanto más corrupto el Estado, más leyes dicta.", author: "Tácito" },
  {
    text: "Es fácil ser notoriamente 'compasivo' si obligas a otros a pagarlo.",
    author: "Murray Rothbard",
  },
  {
    text: "No hay elección moral genuina si no se hace en libertad.",
    author: "Murray Rothbard",
  },
  {
    text: "El Estado, por su esencia, debe transgredir las normas morales que la mayoría acata.",
    author: "Murray Rothbard",
  },
  {
    text: "Insistamos: 'nosotros' no somos el gobierno; el gobierno no es 'nosotros'.",
    author: "Murray Rothbard",
  },
  {
    text: "Para entender la visión libertaria del Estado y sus actos, imagínalo como una banda de criminales: todo cobrará sentido.",
    author: "Murray Rothbard",
  },
  {
    text: "El Estado es esa gran ficción por la que todos tratan de vivir a costa de todos.",
    author: "Frédéric Bastiat",
  },
  {
    text: "La vida, la libertad y la propiedad no existen porque los hombres dictaron leyes. Al revés: esas leyes nacieron porque ya existían la vida, la libertad y la propiedad.",
    author: "Frédéric Bastiat",
  },
  {
    text: "La auténtica brecha no separa conservadores de revolucionarios, sino autoritarios de libertarios.",
    author: "George Orwell",
  },
  {
    text: "La democracia ha de ser algo más que dos lobos y una oveja votando qué cenar.",
    author: "James Bovard",
  },
  {
    text: "No es de la benevolencia del carnicero, el cervecero o el panadero de quien esperamos la cena, sino de su propio interés.",
    author: "Adam Smith",
  },
  {
    text: "La insólita labor de la economía es mostrar a los hombres cuán poco saben de lo que creen poder diseñar.",
    author: "Friedrich Hayek",
  },
  {
    text: "El culto al Estado es culto a la fuerza.",
    author: "Ludwig von Mises",
  },
  {
    text: "Sobre sí mismo, sobre su cuerpo y su mente, el individuo es soberano.",
    author: "John Stuart Mill",
  },
  {
    text: "Una sociedad que antepone la igualdad a la libertad no logrará ninguna. Aquella que antepone la libertad a la igualdad alcanzará ambas en alto grado.",
    author: "Milton Friedman",
  },
  {
    text: "Desapruebo lo que dices, pero defenderé hasta la muerte tu derecho a decirlo.",
    author: "Voltaire",
  },
  {
    text: "Todos los hombres reconocen el derecho a la revolución; es decir, el derecho a rechazar la lealtad y resistir al gobierno cuando su tiranía o ineficacia son grandes e intolerables.",
    author: "Henry David Thoreau",
  },
  {
    text: "Si la tributación sin consentimiento no es robo, entonces cualquier banda de ladrones solo tiene que declararse gobierno, y todos sus robos quedan legalizados.",
    author: "Lysander Spooner",
  },
  {
    text: "El gobierno es una enfermedad que se disfraza de su propia cura.",
    author: "Robert LeFevre",
  },
  {
    text: "La política es el arte de buscar problemas, hallarlos aunque no existan, diagnosticarlos incorrectamente y aplicar el remedio equivocado.",
    author: "Groucho Marx",
  },
  {
    text: "Estamos acercándonos rápidamente a la etapa en que el gobierno puede hacer lo que le plazca, mientras los ciudadanos solo actúan con permiso.",
    author: "Ayn Rand",
  },
  {
    text: "La más pequeña minoría en la Tierra es el individuo. Quienes niegan los derechos individuales no pueden pretender defender a las minorías.",
    author: "Ayn Rand",
  },
  {
    text: "No hay peor tiranía que aquella en que se obliga a los hombres a hacer lo que no quieren, solo porque se juzga conveniente para ellos.",
    author: "Lysander Spooner",
  },
  {
    text: "Cuando el pueblo teme al gobierno, hay tiranía; cuando el gobierno teme al pueblo, hay libertad.",
    author: "Denis Diderot",
  },
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
    <div
      aria-live="polite"
      className="text-center text-sm md:text-base text-muted-foreground select-none"
    >
      {/* Reserve vertical space for up to 2 lines to prevent layout shifts when quotes change length */}
      <div
        className="flex items-center justify-center w-full"
        style={{ minHeight: `calc(2 * 1.2em)` }}
      >
        <p
          className={`transition-opacity ${visible ? "opacity-100" : "opacity-0"}`}
          style={{ transitionDuration: `${fade}ms`, lineHeight: "1.2" }}
        >
          <span className="font-playfair italic">“{quote.text}”</span>
          {quote.author && (
            <span className="font-playfair ml-2 not-italic text-[15px] text-muted-foreground">
              ~ {quote.author}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
