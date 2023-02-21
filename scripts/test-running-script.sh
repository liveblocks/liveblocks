echo "Running test scripts..."

git current-branch

VERSION=
TAG=
while getopts V:t:h flag; do
    case "$flag" in
        V) VERSION=$OPTARG;;
        t) TAG=$OPTARG;;
        *) usage; exit 2;;
    esac
done
shift "$(($OPTIND - 1))"

echo Version "$VERSION"
echo Tag "$TAG"